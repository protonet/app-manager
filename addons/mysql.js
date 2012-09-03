var crypto = require('crypto'),
    db     = require('./../db.js');

exports.server = 'localhost';

exports.checkDB = function (name, callback) {
  var sql = "SELECT * FROM `mysql`.`user` WHERE `User` = 'app-" +
            name + "' AND `Host` = 'localhost' LIMIT 1;";
  
  db.conn.query(sql).on('result', callback);
};

exports.createDB = function (name, password, callback) {
  var createSql = "CREATE DATABASE `app-" + name + "`;",
      grantSql  = "GRANT ALL ON `app-" + name + "`.* TO 'app-" +
                  name + "'@'localhost' IDENTIFIED BY '" +
                  password + "';";
  
  db.conn.query( createSql).on('result', function () {
    db.conn.query(grantSql).on('result', callback);
  });
};

exports.deleteDB = function (name, callback) {
  var dropDbSql   = "DROP DATABASE `app-" + name + "`;",
      dropUserSql = "DROP USER 'app-" + name +
                    "'@'localhost';";
  
  db.conn.query(dropUserSql).on('result', function () {
    db.conn.query(dropDbSql).on('result', callback);
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
  
  var create = function () {
    exports.createDB(app.name, password, function () {
      app.config.env.DATABASE_URL = "mysql2://app-" + app.name + ":" + password + "@" + exports.server + "/app-" + app.name;
      app.saveConfig();
      
      callback(null);
    });
  };

  exports.checkDB(app.name, function (user) {
    if (user)
      exports.deleteDB(app.name, create);
    else
      create();
  });
};

