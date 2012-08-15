var path  = require('path'),
    fs    = require('fs'),
    spawn = require('child_process').spawn,
    yaml  = require('js-yaml'),
    fetch = require('./fetch');

module.exports = function () {};

module.exports.maintainStore = function () {
  var stock = require('./conf/buildpacks.json');
  module.exports.stock = [];

  for (var i = 0; i < stock.length; i++) {
    var pack = module.exports.fromStock(stock[i]);
    module.exports.stock.push(pack);
    /*pack.ensureLatest(function (success) {
      console.log('ensureLatest completed on', pack.path, '-', success);
    });*/
  };
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
    fs.exists(this.path, callback);
  },

  ensureLatest: function (callback) {
    var self = this;
    
    this.onDisk(function (exists) {
      if (exists) {
        if (self.sourceInfo.method != 'git') return;
        
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
    var proc = spawn(path.join(this.path, command), args || [], {cwd: (cwd || this.path)});

    proc.on('exit', exitCall);
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', dataCall);
  },

  detect: function (buildPath, callback) {
    var buffer = '';

    this.runBin('bin/detect', [buildPath], null, function (code) {
      callback(!code && buffer.slice(0, buffer.length - 1));
    }, function (data) {
      buffer += data;
    });
  },

  compile: function (buildPath, cachePath, exitCall, lineCall) {
    var buffer = '';

    this.runBin('bin/compile', [buildPath, cachePath], buildPath, function (code) {
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

    this.runBin('bin/release', [buildPath], buildPath, function (code) {
      callback(yaml.load(buffer));
    }, function (data) {
      buffer += data;
    });
  },
};
