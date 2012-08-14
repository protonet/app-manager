var path  = require('path'),
    fs    = require('fs'),
    spawn = require('child_process').spawn,
    
    db    = require('./db'),
    rpc   = require('./rpc'),
    httpd = require('./httpd'),
    packs = require('./buildpack'),

    storeRoot = path.join(path.dirname(module.filename), 'store'),
    appRoot   = path.join(storeRoot, 'apps');

packs.storePath = path.join(storeRoot, 'buildpacks');
packs.maintainStore();

packs.detect('/home/danopia/Code/protonet/app-manager/store/apps/node-example', function (pack, name) {
  console.log(pack, name);
});

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

function installFrom (uri, callback) {
  fetch(uri, function (appPath) {
    console.log('Fetched into ' + appPath);
    
    locate(rawPath, srcPath, function (packager) {
      var slug = packager.getSlug(srcPath),
          appPath = path.join(appRoot, slug);
      
      console.log('Packaging an ' + packager.name + ' app called ' + slug + ' at ' + srcPath);
      
      packager.assemble(srcPath, function () {
        console.log('Assembly complete of ' + slug);
        
        fs.rename(srcPath, appPath, function () {
          console.log(slug + ' is now in place at ' + appPath);
          
          fs.writeFile(path.join(appPath, '.packager'), packager.id, 'utf8', function () {
            console.log('Associated ' + slug + ' with the ' + packager.name + ' engine');
            console.log(slug + ' successfully assembled and ready to roll.');
            
            callback(slug);
          });
        });
      });
    });
  });
}

function startApp (slug, callback) {
  var port = httpd.reservePort(slug);
  var appPath = path.join(appRoot, slug);
  
  fs.readFile(path.join(appPath, '.packager'), 'utf8', function (err, packagerName) {
    var packager;
    packagers.forEach(function (thisPackager) {
      if (thisPackager.id == packagerName)
        packager = thisPackager;
    });
    
    packager.start(appPath, slug, port);
    
    // TODO: wait for confirmation from packager?
    callback(packager, port);
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
  
  var obj = {};
  obj.hello = function (params, callback) {
    callback(null, 'Hello, world!');
  };
  obj.help = function (params, callback) {
    callback(null, 'The only valid command is hello.');
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

