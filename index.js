var path  = require('path'),
    fs    = require('fs'),
    spawn = require('child_process').spawn,
    
    store = require('./store'),
    db    = require('./db'),
    rpc   = require('./rpc'),
    httpd = require('./httpd'),
    packs = require('./buildpack'),
    packs = require('./app'),
    fetch = require('./fetch');

store.root = path.join(path.dirname(module.filename), 'store');

packs.maintainStore();

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

  // detect "path":"/home/danopia/Code/protonet/app-manager/store/apps/node-example"
  var obj = {
    install: function (params, callback) {
      app.fromURI(params.uri, params.basename, function (app) {
        app.install(function (line) {
          callback(null, line);
        }, function (err) {
          callback(err, "Installation complete");
        });
      });
    },
  };
  
  obj.help = function (params, callback) {
    callback(null, {
      install: "Fetches `uri` into the local app store, optionally as `basename`.",
    });
  };
  
  rpc.start(obj);
});

//installFrom('git@heroku.com:simple-mist-848.git');

/*
installFrom('/home/danopia/Code/protonet/app-manager/apps/github-bridge.zip', function (slug) {
installFrom('/home/danopia/Code/protonet/app-manager/apps/hellojs.zip', function (slug) {
installFrom('/home/danopia/Code/protonet/app-manager/apps/hellojs2.zip', function (slug) {
installFrom('/home/danopia/Code/protonet/app-manager/apps/jello.zip', function (slug) {
  console.log('Phew! Done installing ' + slug + '. Now trying to start it...');
  //var slug = 'node-example';
  
  startApp(slug, function (packager, port) {
    console.log(packager.name + ' app ' + slug + ' is now running on http://localhost:7200/' + slug);
  });
});

*/

