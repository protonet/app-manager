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
        fs.mkdir(path.join(appPath, 'cache'), function (err) {
          callback(appPath);
        });
      });
    };
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
      createName(basename, function (root) {
        var target = path.join(root, 'src');
        fetch.fetchInto(info, target, function (success) {
          callback(!success, path.basename(root));
        });
      });
    },
    
    detect: function (params, callback) {
      var target = path.join(appRoot, params.app, 'src');
      packs.detect(target, function (pack, name) {
        callback(null, [pack, name]);
      });
    },
    
    compile: function (params, callback) {
      var root = path.join(appRoot, params.app);
      
      // TODO: use APIs and step()
      var args = ['-rf', path.join(root, 'slug')];
      spawn('rm', args).on('exit', function () {
        args = ['-r', path.join(root, 'src'), path.join(root, 'slug')];
        spawn('cp', args).on('exit', function () {
          args = ['-rf', path.join(root, 'slug', '.git')];
          spawn('rm', args).on('exit', function () {
            packs.detect(path.join(appRoot, params.app, 'src'), function (pack, name) {
              // TODO: catch no pack matching
              pack.compile(path.join(root, 'slug'), path.join(root, 'cache'), function (success) {
                callback(!success, 'Installed');
              }, function (line) {
                callback(null, line);
              });
            });
          });
        });
      });
    },
    
  };
  
  obj.help = function (params, callback) {
    callback(null, {
      fetch: "Fetches `uri` into the local app store, optionally as `basename`.",
      detect: "Detects the type of application located at `app`.",
      compile: "Compiles a slug for `app`.",
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

