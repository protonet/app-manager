var path  = require('path'),
    fs    = require('fs'),
    spawn = require('child_process').spawn,
    
    packs = require('./buildpack'),
    store = require('./store'),
    fetch = require('./fetch'),
    mysql = require('./addons/mysql');

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

  app.readManifest(function (manifest) {
    app.manifest = manifest;
    
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

  readManifest: function (callback) {
    var file = path.join(this.src, 'manifest.json');
    fs.readFile(file, 'utf8', function (err, data) {
      if (err) {
        console.log(err);
        callback(false);
      } else {
        var json = JSON.parse(data);
        console.log(json);
        callback(json);
      };
    });
  },

  saveConfig: function (callback) {
    fs.writeFile(this.conf, JSON.stringify(this.config), callback);
  },
  
  installAddons: function (callback) {
    this.toInstall = [];
    this.addonCall = callback;
    
    // Gather heroku-style addons
    if (this.config && this.config.addons) {
      for (var i = 0; i < this.config.addons.length; i++) {
        var addon = this.config.addons[i];
        
        if (addon == 'shared-database:5mb')
          addon = 'mysql';
        
        if (this.toInstall.indexOf(addon) < 0)
          this.toInstall.push(addon);
      };
    };
    
    // Gather native addons
    if (this.manifest && this.manifest.addons) {
      for (var i = 0; i < this.config.addons.length; i++) {
        var addon = this.config.addons[i];
        
        if (this.toInstall.indexOf(addon) < 0)
          this.toInstall.push(addon);
      };
    };
    
    // Gather DB addon
    if (this.manifest && this.manifest.database) {
      var addon = this.manifest.database;
      
      if (this.toInstall.indexOf(addon) < 0)
        this.toInstall.push(addon);
    };
    
    // Start the installation chain
    this._installAddon();
  },
  
  // Recursively install addons
  _installAddon: function (err) {
    // Anything to do here?
    if (this.toInstall.length == 0)
      return this.addonCall(); // Nothing to do here
    
    // Map of addon names to handlers
    var addons = {mysql: mysql};
    
    // Get the desired addon
    console.log("Installing", this.toInstall, '. . .');
    var addon = addons[this.toInstall.shift()];
    if (!addon) throw 'No such addon: ' + addon;
    
    // Ask it to install
    var self = this;
    addon.install(this, function (err) {
      console.log("done.");
      self._installAddon(err);
    });
  }
};
