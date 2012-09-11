var path  = require('path'),
    fs    = require('fs'),
    spawn = require('child_process').spawn,
    yaml  = require('js-yaml'),
    
    fetch = require('./fetch'),
    store = require('./store');

module.exports = function () {};

module.exports.pending = 0;
module.exports.maintainStore = function () {
  module.exports.storePath = path.join(store.root, 'buildpacks');
  
  var stock = require('./conf/buildpacks.json');
  module.exports.stock = [];

  stock.forEach(function (entry) {
    var pack = module.exports.fromStock(entry);
    module.exports.stock.push(pack);
    // TODO: be more intelligent, have a last checked time, update at
    // most once a day or so
    
    // TODO: replace with fs.exists() if/when the prod node.js is upgraded
    fs.stat(pack.path, function (err, stats) {
      if (!err) return;
      module.exports.pending++;
      pack.ensureLatest(function (success) {
        console.log('ensureLatest completed on', pack.path, '- success:', success);
        module.exports.pending--;
      });
    });
  });
  
  module.exports.timer = setInterval(function () {
    if (module.exports.pending) return;
    clearInterval(module.exports.timer);
    delete module.exports.timer;
    
    console.log('-----> Buildpack store maintanence complete');
    
    if (module.exports.readyCallback)
      module.exports.readyCallback();
  }, 2500);
};

module.exports.whenReady = function (callback) {
  if (module.exports.timer)
    module.exports.readyCallback = callback;
  else
    callback();
};

module.exports.fromStock = function (info) {
  var pack = new module.exports();
  pack.name = info.name;
  pack.sourceInfo = fetch.detect(info.uri);
  pack.path = path.join(module.exports.storePath, pack.sourceInfo.basename);
  return pack;
};

module.exports.fromStore = function (name) {
  var pack = new module.exports();
  pack.name = name;
  pack.path = path.join(module.exports.storePath, name);
  return pack;
};

module.exports.detect = function (buildPath, callback, stack) {
  if (!stack) stack = module.exports.stock;
  if (!stack.length) return callback(null);

  var self = this;

  stack[0].detect(buildPath, function (name) {
    if (name) {
      callback(stack[0], name);
    } else {
      self.detect(buildPath, callback, stack.splice(1));
    };
  });
};

module.exports.prototype = {
  onDisk: function (callback) {
    fs.stat(this.path, callback);
  },

  ensureLatest: function (callback) {
    var self = this;
    
    this.onDisk(function (err, stat) {
      if (stat) {
        if (self.sourceInfo.method != 'git') return;

        // TODO: handle commit freezes
        spawn('git', ['pull'], {cwd: self.path}).on('exit', function () {
          callback(true);
        });
      } else {
        fetch.fetchInto(self.sourceInfo, self.path, function (success) {
          callback(success);
        });
      };
    });
  },

  // TODO: sandbox it a little
  runBin: function (command, args, cwd, exitCall, dataCall) {
    var opts = {cwd: (cwd || this.path), env: {PATH: process.env.PATH}};
    var proc = spawn(path.join(this.path, 'bin', command), args || [], opts);

    proc.on('exit', exitCall);
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', dataCall);
  },

  detect: function (buildPath, callback) {
    var buffer = '';

    this.runBin('detect', [buildPath], null, function (code) {
      callback(!code && buffer.slice(0, buffer.length - 1));
    }, function (data) {
      buffer += data;
    });
  },

  compile: function (buildPath, cachePath, exitCall, lineCall) {
    var buffer = '';

    this.runBin('compile', [buildPath, cachePath], buildPath, function (code) {
      exitCall(!code);
    }, function (data) {
      buffer += data;

      while (buffer.indexOf("\n") >= 0) {
        lineCall(buffer.substr(0, buffer.indexOf("\n")));
        buffer = buffer.substr(buffer.indexOf("\n") + 1);
      };
    });
  },

  release: function (buildPath, callback) {
    var buffer = '';

    this.runBin('release', [buildPath], buildPath, function (code) {
      callback(yaml.load(buffer));
    }, function (data) {
      buffer += data;
    });
  },
};
