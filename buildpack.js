var path  = require('path'),
    fs    = require('fs'),
    spawn = require('child_process').spawn,
    yaml  = require('js-yaml'),
    fetch = require('./fetch');

exports.maintainStore = function () {
  var stock = require('./conf/buildpacks.json');
  exports.stock = [];

  for (var i = 0; i < stock.length; i++) {
    var pack = exports.Buildpack.fromStock(stock[i]);
    exports.sock.push(pack);
    pack.ensureLatest(function (success) {
      console.log('ensureLatest completed on', pack.path, '-', success);
    });
  };
};

exports.Buildpack = function () {};

exports.Buildpack.fromStock = function (info) {
  var pack = new exports.Buildpack();
  pack.name = info.name;
  pack.sourceInfo = fetch.detect(info.uri);
  pack.path = path.join(exports.storePath, pack.sourceInfo.basename);
  return pack;
};

exports.Buildpack.fromStore = function (name) {
  var pack = new exports.Buildpack();
  pack.name = name;
  pack.path = path.join(exports.storePath, name);
  return pack;
};

exports.Buildpack.prototype = {
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
  runBin: function (command, args, exitCall, dataCall) {
    var proc = spawn(command, args || [], {cwd: this.path});

    proc.on('exit', exitCall);
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', dataCall);
  },

  detect: function (buildPath, callback) {
    var buffer = '';

    this.runBin('bin/detect', [buildPath], function (code) {
      callback(!code && buffer);
    }, function (data) {
      buffer += data;
    });
  },

  compile: function (buildPath, cachePath, exitCall, lineCall) {
    var buffer = '';

    this.runBin('bin/compile', [buildPath, cachePath], function (code) {
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

    this.runBin('bin/release', [buildPath], function (code) {
      callback(yaml.load(buffer));
    }, function (data) {
      buffer += data;
    });
  },
};
