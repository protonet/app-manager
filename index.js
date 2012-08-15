var path  = require('path'),
    fs    = require('fs'),
    spawn = require('child_process').spawn,
    
    db    = require('./db'),
    rpc   = require('./rpc'),
    httpd = require('./httpd'),
    packs = require('./buildpack'),
    fetch = require('./fetch'),

    storeRoot = path.join(path.dirname(module.filename), 'store'),
    appRoot   = path.join(storeRoot, 'apps');

packs.storePath = path.join(storeRoot, 'buildpacks');
packs.maintainStore();

function createName (name, callback) {
  var appPath = path.join(appRoot, name);
  fs.exists(appPath, function (exists) {
    if (exists) {
      createName(name + '-', callback);
    } else {
      fs.mkdir(appPath, function (err) {
        callback(appPath);
      });
    }
  });
}

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
    fetch: function (params, callback) {
      var info = fetch.detect(params.uri);
      var basename = params.basename || info.basename;
      var target = path.join(appRoot, basename);
      fetch.fetchInto(info, target, function (success) {
        callback(!success, basename);
      });
    },
    
    detect: function (params, callback) {
      packs.detect(params.path, function (pack, name) {
        console.log(pack, name);
        callback(null, [pack, name.slice(0, name.length - 1)]);
      });
    },
    
  };
  
  obj.help = function (params, callback) {
    callback(null, {
      fetch: "Fetches `uri` into the local app store, optionally as `basename`.",
      detect: "Detects the type of application located at `path`.",
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

