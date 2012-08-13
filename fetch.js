var path  = require('path'),
    fs    = require('fs'),
    spawn = require('child_process').spawn;

exports.detect = function (uri) {
  if (uri.match(/^git(@|:\/\/)/)) {
    parts = uri.match(/^(.+?)(?:#([0-9a-f]+))?$/i);
    return {
      method: 'git',
      basename: path.basename(parts[1], '.git'),
      uri: parts[1],
      commit: parts[2]
    };
    
  } else if (uri.match(/^\/.+\.zip$/i)) {
    return {
      method: 'unzip',
      basename: path.basename(uri, '.zip'),
      uri: uri,
      filter: path.join(path.basename(uri, '.zip'), '*')
    };
    
  } else {
    console.log('I have no idea how to grab ' + uri);
    return null;
  }
}

exports.fetchInto = function (info, target, callback) {
  if (!info.method) info = exports.detect(info);
  console.log('Fetching', info);

  switch (info.method) {
  case 'git':
    spawn('git', ['clone', info.uri, target]).on('exit', function () {
      if (parts[2]) {
        var args = ['checkout', '-f', parts[2]],
            opts = {env: path.join(appPath, 'src')};
        spawn('git', args, opts).on('exit', function () {
          callback(appPath);
        });
      } else {
        callback(appPath);
      }
    });
    
  } else if (uri.match(/^\/.+\.zip$/i)) {
    console.log('Local zip archive identified, extracting');
    createName(path.basename(uri, '.zip'), function (appPath) {
      var args = [uri, '-d', appPath, info.filter];
      spawn('unzip', opts).on('exit', function () {
        callback(appPath);
      });
    });
    
  } else {
    console.log('I have no idea how to grab ' + uri);
    return false;
  }
}
