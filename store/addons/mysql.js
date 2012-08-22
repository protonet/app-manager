var crypto = require('crypto'),
    db     = require('./../../db');

exports.server = 'localhost';

exports.create = function (name, password, callback) {
  // TODO: step()
  db.conn.query("CREATE DATABASE " + name + ";").on('result', function () {
    db.conn.query("GRANT ALL ON " + name + ".* TO '" + name + "'@'" + exports.server + "' IDENTIFIED BY '" + password + "';").on('result', function () {
      callback();
    });
  });
};

exports.genPassword = function () {
  var random = crypto.randomBytes(16),
      hash   = crypto.createHash('sha1');

  hash.update(random);
  return hash.digest('hex');
};

exports.install = function (app, callback) {
  var password = exports.genPassword();

  // TODO: step()
  exports.create(app.name, password, function () {
    app.config.env.DATABASE_URL = "mysql2://" + app.name + ":" + password + "@" + exports.server + "/" + app.name;
    app.saveConfig();
    
    callback(null);
  });
};

    
