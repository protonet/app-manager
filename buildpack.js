var path  = require('path'),
    fs    = require('fs'),
    spawn = require('child_process').spawn,
    fetch = require('./fetch');

exports.maintainStore = function () {
  var stock = require('./conf/buildpacks.json');

  for (var i = 0; i < stock.length; i++) {
    var pack = exports.Buildpack.fromStock(stock[i]);
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

exports.Buildpack.prototype.onDisk = function (callback) {
  fs.exists(this.path, callback);
};

exports.Buildpack.prototype.ensureLatest = function (callback) {
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
};
