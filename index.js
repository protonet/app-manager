var path  = require('path'),
    fs    = require('fs'),
    spawn = require('child_process').spawn,
    
    httpd = require('./httpd');

var packagers = [require('./packagers/node'), require('./packagers/rack')];

var storeRoot = path.join(path.dirname(module.filename), 'store');
if (!fs.existsSync(storeRoot)) require('fs').mkdirSync(storeRoot);
  
var appRoot = path.join(storeRoot, 'apps');
if (!fs.existsSync(appRoot)) require('fs').mkdirSync(appRoot);
  
var tmpRoot = path.join(storeRoot, 'tmp');
if (!fs.existsSync(tmpRoot)) require('fs').mkdirSync(tmpRoot);

// Create a unique temp directory to work in for unknown apps
function getTmp(callback) {
  spawn('mktemp', ['-d', '--tmpdir=' + tmpRoot, 'XXXXXXXXXX']).stdout.
    on('data', function (data) {
      callback(data.trim());
    }).setEncoding('utf8');
}

function fetch(uri, target, callback) {
  console.log('Fetching ' + uri);
  
  if (uri.match(/^git(@|:\/\/)/)) {
    console.log('Remote git repo identified, cloning');
    spawn('git', ['clone', uri, target]).on('exit', callback);
    
  } else if (uri.match(/^\/.+\.zip$/i)) {
    console.log('Local zip archive identified, extracting');
    spawn('unzip', [uri, '-d', target]).on('exit', callback);
    
  } else {
    console.log('I have no idea how to grab ' + uri);
    return false;
  }
}

function getMagicFiles() {
  var magicFiles = [];
  
  packagers.forEach(function (packager) {
    magicFiles = magicFiles.concat(packager.magics);
  });
  
  return magicFiles;
}

function checkDirectoriesForMagics(magics, dirs, callback) {
  var foundMagics = [];
  var foundChildren = [];
  
  dirs.forEach(function (dir) {
    fs.readdir(dir, function (readErr, files) {
      files.forEach(function (file) {
        var filePath = path.join(dir, file);
        
        fs.stat(filePath, function (statErr, stats) {
          if (stats.isFile()) {
            if (magics.indexOf(file) >= 0) {
              foundMagics.push(filePath);
            }
          } else if (stats.isDirectory()) {
            foundChildren.push(filePath);
          }
          
          files.splice(files.indexOf(file), 1);
          
          if (files.length == 0) {
            dirs.splice(dirs.indexOf(dir), 1);
            
            if (dirs.length == 0) {
              callback(foundMagics, foundChildren);
            }
          }
        });
      });
    });
  });
}

function locate(raw, target, callback) {
  var magicFiles = getMagicFiles();
  
  var checkBack = function (foundMagics, childDirs) {
    if (foundMagics.length > 0) {
      var magic = foundMagics[0];
      var packager;
      
      packagers.forEach(function (thisPackager) {
        if (thisPackager.magics.indexOf(path.basename(magic)) >= 0)
          packager = thisPackager;
      });
      
      console.log('Found a ' + packager.name + ' magic file at ' + magic);
      
      fs.rename(path.dirname(magic), target, function () {
        callback(packager);
        
        // TODO: rm -r raw
      });
    }
    
    checkDirectoriesForMagics(magicFiles, childDirs, checkBack);
  }
  
  checkBack([], [raw]);
}

function installFrom(uri, callback) {
  getTmp(function (tmp) {
    console.log('Secured ' + tmp + ' to work in');
    
    var rawPath = path.join(tmp, 'raw'),
        srcPath = path.join(tmp, 'src');
    
    fetch(uri, rawPath, function () {
      console.log('Fetched into ' + rawPath);
      
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
              console.log(slug + ' successfully assemblied and ready to roll.');
              
              callback(slug);
            });
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

//installFrom('git@heroku.com:simple-mist-848.git');

installFrom('/home/danopia/Code/protonet/app-manager/apps/github-bridge.zip', function (slug) {
  console.log('Phew! Done installing ' + slug + '. Now trying to start it...');
  //var slug = 'node-example';
  
  startApp(slug, function (packager, port) {
    console.log(packager.name + ' app ' + slug + ' is now running on http://localhost:7200/' + slug);
  });
});

installFrom('/home/danopia/Code/protonet/app-manager/apps/hellojs.zip', function (slug) {
  console.log('Phew! Done installing ' + slug + '. Now trying to start it...');
  //var slug = 'node-example';
  
  startApp(slug, function (packager, port) {
    console.log(packager.name + ' app ' + slug + ' is now running on http://localhost:7200/' + slug);
  });
});

installFrom('/home/danopia/Code/protonet/app-manager/apps/hellojs2.zip', function (slug) {
  console.log('Phew! Done installing ' + slug + '. Now trying to start it...');
  //var slug = 'node-example';
  
  startApp(slug, function (packager, port) {
    console.log(packager.name + ' app ' + slug + ' is now running on http://localhost:7200/' + slug);
  });
});

installFrom('/home/danopia/Code/protonet/app-manager/apps/jello.zip', function (slug) {
  console.log('Phew! Done installing ' + slug + '. Now trying to start it...');
  //var slug = 'node-example';
  
  startApp(slug, function (packager, port) {
    console.log(packager.name + ' app ' + slug + ' is now running on http://localhost:7200/' + slug);
  });
});

