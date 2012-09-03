var path = require('path'),
    fs   = require('fs');

exports.createName = function (type, name, callback) {
  var appPath = path.join(exports.root, type, name);
  fs.stat(appPath, function (err, stats) {
    if (stats) {
      exports.createName(type, name + '-', callback);
    } else {
      fs.mkdir(appPath, function (err) {
        callback(name, appPath);
      });
    };
  });
};
