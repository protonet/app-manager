var path  = require('path'),
    
    dyno  = require('./dyno'),
    store = require('./store'),
    db    = require('./db'),
    rpc   = require('./rpc'),
    httpd = require('./httpd'),
    app   = require('./app');

store.root = path.join(path.dirname(module.filename), 'store');

require('./buildpack').maintainStore();

db.connect(function () {
  console.log('Database ready');
  
  /*db.insert('apps', {
    name: 'helloworld2',
    label: 'Hello World 2',
    manifest: {desc: "Says 'Hello' to the world again."},
    config: {},
    created_at: new Date()
  }, function (err, id) {
    console.log(err, id);
  });//*/
  /*
  db.update('apps', {name: 'helloworld'}, {
    manifest: {desc: "Says 'Hello' to the World."},
    label: "Hello, World"
  }, function (err) {
    console.log(err);
  });
  
  db.conn.query('SELECT * FROM `app-manager`.`apps`').on('result', function(row) {
    console.log(row);
  });*/

  var obj = {
    install: function (params, callback) {
      app.fromURI(params.uri, params.basename, function (app) {
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
    },

    run: function (params, callback) {
      app.fromName(params.app, function (app) {
        dyno.start(app, params.proc || "web", params.args, callback);
      });
    },

    upgrade: function (params, callback) {
      app.fromName(params.app, function (app) {
        app.upgrade(function (line) {
          callback(null, line);
        }, function (err) {
          callback(err, "Installation complete");
          dyno.start(app, "web", null, callback);
          dyno.start(app, "web", null, callback);
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

if (process.argv[2] == 'daemon') {
  var pidfile = path.join(path.dirname(module.filename), '..', 'tmp', 'pids', 'app-manager_' + httpd.port + '.pid')
  require('fs').writeFile(pidfile, process.pid);
  process.send(true);
};

// install "uri":"https://github.com/danopia/bubblegum.git"
// install "uri":"https://github.com/halorgium/mephisto.git"
// install "uri":"https://github.com/TracksApp/tracks.git"
// install "uri":"/home/danopia/Code/protonet/app-manager/apps/hellojs.zip"
// install "uri":"git@heroku.com:simple-mist-848.git","basename":"github-bridge"
// install "uri":"git@heroku.com:danopia.git"
// install "uri":"git@heroku.com:duhousing.git"
// install "uri":"git@github.com:protonet/homepage_new.git","basename":"homepage"

// install "uri":"https://github.com/appelier/bigtuna.git"
// run "app":"bigtuna","proc":"rake","args":"db:migrate"

// install "uri":"https://github.com/TracksApp/tracks.git"
// run "app":"tracks","proc":"rake","args":"db:migrate"


// https://github.com/xlsuite/xlsuite.git
// DB is weird
