var path  = require('path'),
    fs    = require('fs'),
    
    dyno  = require('./dyno'),
    store = require('./store'),
    db    = require('./db'),
    rpc   = require('./rpc'),
    httpd = require('./httpd'),
    app   = require('./app'),
    bp    = require('./buildpack');

// Redirect output when daemonized
if (process.argv[2] == 'daemon') {
  var cwd     = path.dirname(module.filename);
  var logfile = path.join(cwd, '..', 'log', 'app-manager.log');
  var logout  = fs.createWriteStream(logfile);
  
  process.__defineGetter__('stdout', function () { return logout; });
  process.__defineGetter__('stderr', function () { return logout; });
};

store.root = path.join(path.dirname(module.filename), 'store');

bp.maintainStore();

db.connect(function () {
  console.log('Database ready');
  
  var obj = {
    install: function (params, callback) {
      app.fromURI(params.uri, params.basename, function (app) {
        bp.whenReady(function () {
          app.install(function (line) {
            callback('partial', line);
          }, function (err) {
            callback('partial', "Installation complete");
            app.installAddons(function () {
              callback(err, "Starting a dyno");
              dyno.start(app, "web", null, function () {
                callback(err, "Application online");
              });
            });
          });
        });
      });
    },

    run: function (params, callback) {
      app.fromName(params.app, function (app) {
        dyno.start(app, params.proc || "web", params.args, callback);
      });
    },

    upgrade: function (params, callback) {
      app.fromName(params.app, function (app) {
        bp.whenReady(function () {
          app.upgrade(function (line) {
            callback(null, line);
          }, function (err) {
            callback(err, "Installation complete");
            dyno.start(app, "web", null, callback);
            dyno.start(app, "web", null, callback);
          });
        });
      });
    },

    manifest: function (params, callback) {
      app.fromName(params.app, function (app) {
        app.readManifest(function (manifest) {
          app.manifest = manifest;
          callback(null, manifest);
        });
      });
    },
  };
  
  obj.help = function (params, callback) {
    callback(null, {
      install: "Fetches `uri` into the local app store, optionally as `basename`.",
      run: "Spins off a `proc` instance from `app`.",
    });
  };
  
  rpc.start(obj);
});

var kills = 0;
function cleanup () {
  kills++;
  
  if (kills > 2) {
    console.log('Okay, fine.');
    process.exit(255);
  } else {
    console.log('\rAttempting clean shutdown');
    httpd.server.close();
    dyno.killAll();
    rpc.conn.end();
    db.conn.end();
    console.log("Hit C-c again if it didn't work.");
  }
}
process.addListener('SIGINT',  cleanup); // C-c
process.addListener('SIGTERM', cleanup); // kill

app.fromName('market', function (market) {
  if (market) return;
  
  bp.whenReady(function () {
    console.log('Installing the App Market');
    app.fromURI('https://github.com/protonet-apps/market.git', null, function (app) {
      app.install(function (line) {
        console.log('market:', line);
      }, function (err) {
        console.log('market:', 'Installation complete');
        app.installAddons(function () {
          console.log('market:', 'App Market installed and ready for business');
        });
      });
    });
  });
});

// Signal to parent, if any, that we're ready
if (process.send) {
  process.send(true);
};

