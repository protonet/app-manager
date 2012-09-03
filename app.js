var path  = require('path'),
    fs    = require('fs'),
    spawn = require('child_process').spawn,
    
    packs = require('./buildpack'),
    store = require('./store'),
    fetch = require('./fetch');

var App = function (name) {
  this.name  = name;
  this.dynos = {};
  
  this.root  = path.join(store.root, 'apps', name);
  
  this.conf  = path.join(this.root, 'config.json');
  this.src   = path.join(this.root, 'src');
  this.slug  = path.join(this.root, 'slug');
  this.cache = path.join(this.root, 'cache');
};

exports.fromName = function (name, callback) {
  var app = new App(name);

  fs.readFile(app.conf, 'utf8', function (err, data) {
    if (data) {
      app.config = JSON.parse(data);
      callback(app);
    } else {
      app.detectPack(function (pack, name) {
        app.pack = pack;
        app.config = {type: name}; // TODO: add pack path
        app.saveConfig(function () {
          callback(app);
        });
      });
    };
  });
};

exports.fromURI = function (uri, basename, callback) {
  var info = fetch.detect(uri);
  var basename = basename || info.basename;
  
  store.createName('apps', basename, function (name, root) {
    fs.mkdir(path.join(root, 'cache'), function (err) {
      var target = path.join(root, 'src');
      fetch.fetchInto(info, target, function (success) {
        if (success) {
          exports.fromName(name, callback);
        } else {
          spawn('rm', ['-rf', root]).on('exit', function () {
            callback(null);
          });
        };
      });
    });
  });
};

App.prototype = {
  detectPack: function (callback) {
    packs.detect(this.src, callback);
  },

  compile: function (lineCall, finalCall) {
    var self = this;
    
    // TODO: use APIs and step()
    spawn('rm', ['-rf', self.slug]).on('exit', function () {
      spawn('cp', ['-r', self.src, self.slug]).on('exit', function () {
        var args = ['-rf', path.join(self.slug, '.git')];
        spawn('rm', args).on('exit', function () {
          self.pack.compile(self.slug, self.cache, finalCall, lineCall);
        });
      });
    });
  },
  
  defaultConfig: function (callback) {
    this.pack.release(this.slug, callback);
  },

  install: function (lineCall, callback) {
    var self = this;
    
    self.compile(lineCall, function (success) {
      if (!success) return callback("Compiliation failed");
      
      self.defaultConfig(function (config) {
        self.config.addons = config.addons;
        self.config.env    = config.config_vars;
        self.config.procs  = config.default_process_types;
        
        self.saveConfig(callback);
      });
    });
  },

  upgrade: function (lineCall, callback) {
    var self = this;
    
    spawn('git', ['pull']).on('exit', function () {
      self.detectPack(function (pack) {
        self.pack = pack;
        self.compile(lineCall, function (success) {
          if (!success) return callback("Compiliation failed");
          
          self.defaultConfig(function (config) {
            // TODO: merge variables
            //self.config.env    = config.config_vars;
            
            self.saveConfig(callback);
          });
        });
      });
    });
  },

  saveConfig: function (callback) {
    fs.writeFile(this.conf, JSON.stringify(this.config), callback);
  },
};
