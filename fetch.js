var path  = require('path'),
    fs    = require('fs'),
    spawn = require('child_process').spawn;

exports.detect = function (uri) {
  if (uri.match(/^(git@|(git|https):\/\/)/)) {
    parts = uri.match(/^(.+?)(?:#([0-9a-f]+))?$/i);
    return {
      method: 'git',
      basename: path.basename(parts[1].replace(':', path.sep), '.git'),
      uri: parts[1],
      commit: parts[2]
    };
    
  } else if (uri.match(/^\/.+\.zip$/i)) {
    return {
      method: 'unzip',
      basename: path.basename(uri, '.zip'),
      uri: uri
    };
    
  } else {
    console.log('I have no idea how to grab ' + uri);
    return null;
  }
}

exports.fetchIntoStore = function (info, store, callback) {
  if (!info.basename) info = exports.detect(info);

  var target = path.join(store, info.basename);
  exports.fetchInto(info, target, function (success) {
    callback(success, info.basename);
  });
}

exports.fetchInto = function (info, target, callback) {
  if (!info.method) info = exports.detect(info);
  console.log('Fetching', info);

  switch (info.method) {
  case 'git':
    spawn('git', ['clone', info.uri, target]).on('exit', function () {
      if (!info.commit) return callback(true);
      
      var args = ['checkout', '-f', info.commit];
      spawn('git', args, {cwd: target}).on('exit', function () {
        callback(true);
      });
    });
    break;
    
  case 'unzip':
    fs.mkdir(target, function () {
      var args = [info.uri, '-d', target];
      spawn('unzip', args).on('exit', function () {
        callback(true);
      });
    });
    break;
    
  default:
    console.log('I have no idea how to grab ' + uri);
    callback(false);
    return false;
  }
}
