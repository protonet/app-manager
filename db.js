var mysql = require('mysql');

exports.conf = require('./conf/database.json');

exports.test = function (goodCallback, badCallback) {
  exports.conn.query('SELECT * FROM `app-manager`.`apps`', function(err, rows, fields) {
    (err ? badCallback : goodCallback)();
  });
};

exports.connect = function (callback) {
  exports.conn = mysql.createConnection(exports.conf);
  exports.conn.connect(function () {
    exports.test(function () {
      //exports.conn.changeUser({database: 'app-manager'}, function () {
        callback && callback();
      //});
    }, function () {
      exports.migrate(function () {
        callback && callback();
      });
    });
  });
};

exports.serializeInsert = function (data) {
  var fields = [],
      values = [];
  
  Object.keys(data).forEach(function (key) {
    var value = data[key];
    
    if (Object.prototype.toString.call(value) == "[object Object]") {
      fields.push('`' + key + '_json`');
      values.push(exports.conn.escape(JSON.stringify(value)));
    } else {
      fields.push('`' + key + '`');
      values.push(exports.conn.escape(value));
    }
  });
  
  return '(' + fields.join(', ') + ') VALUES (' + values.join(', ') + ')';
}

exports.serializeUpdate = function (data) {
  var filtered = {};
  
  Object.keys(data).forEach(function (key) {
    var value = data[key];
    
    if (Object.prototype.toString.call(value) == "[object Object]") {
      filtered[key + '_json'] = JSON.stringify(value);
    } else {
      filtered[key] = value;
    }
  });
  
  return exports.conn.escape(filtered);
}

exports.insert = function (table, data, callback) {
  exports.conn.query('INSERT INTO `app-manager`.`' + table + '` ' + exports.serializeInsert(data) + ';', function(err, rows, fields) {
    callback(err, rows && rows.insertId);
  });
};

exports.update = function (table, filter, data, callback) {
  exports.conn.query('UPDATE `app-manager`.`' + table + '` SET ' + exports.serializeUpdate(data) + ' WHERE ' + exports.serializeUpdate(filter) + ';', function(err, result) {
    callback(err, result && result.affectedRows);
  });
};

exports.migrate = function (callback) {
  require('step')(
    function () {
      exports.conn.query('CREATE SCHEMA `app-manager`', this);
    },
    function (err) {
      if (err) throw err;
      exports.conn.query('GRANT ALL ON `app-manager`.* TO "app-manager"@"localhost"', this);
    },
    function (err) {
      if (err) throw err;
      exports.conn.changeUser({database: 'app-manager'}, this);
    },
    function (err) {
      if (err) throw err;
      exports.conn.query('CREATE TABLE `app-manager`.`apps` (`id` INT NOT NULL AUTO_INCREMENT, `name` VARCHAR(64) NOT NULL, `label` VARCHAR(128) NOT NULL, `enabled` BIT NOT NULL DEFAULT 0, `manifest_json` TEXT NOT NULL, `config_json` TEXT NOT NULL, `source_uri` VARCHAR(512) NULL, `buildpack_uri` VARCHAR(512) NULL, `created_at` DATETIME NOT NULL, `installed_at` DATETIME NULL, PRIMARY KEY (`id`), UNIQUE INDEX `name_UNIQUE` (`name` ASC));', this);
    },
    function (err) {
      if (err) throw err;
      exports.conn.query('CREATE TABLE `app-manager`.`log` (`id` INT NOT NULL AUTO_INCREMENT, `timestamp` DATETIME NOT NULL, `app_id` INT NOT NULL, `state` VARCHAR(16) NOT NULL, `message` TEXT NULL, `due_to` VARCHAR(255) NULL, PRIMARY KEY (`id`), INDEX `fk_log_app` (`app_id` ASC), CONSTRAINT `fk_log_app` FOREIGN KEY (`app_id`) REFERENCES `app-manager`.`apps` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT);', this);
    },
    callback
  );
};

