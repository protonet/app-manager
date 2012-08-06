var path  = require('path'),
    fs    = require('fs'),
    spawn = require('child_process').spawn;

exports.name = 'Node.JS';
exports.id = 'node';
exports.magics = ['package.json'];

exports.getSlug = function (src) {
  console.log('Reading package info from ' + src + '/package.json');
  
  // TODO: async
  var manifest = require(path.join(src, 'package.json'));
  
  return manifest.name;
}

exports.assemble = function (src, callback) {
  console.log('Assembling the Node.JS app in ' + src);
  
  // TODO: async
  var manifest = require(path.join(src, 'package.json'));
  
  var options = {
    cwd: src,
    env: {
      HOME: src,
      PATH: [
        path.join(src, 'bin'),
        path.join(src, 'node_modules', '.bin'),
        '/home/danopia/nvm/v0.8.3/bin',
        '/usr/local/bin',
        '/usr/bin',
        '/bin'
      ].join(':')}}
  
  spawn('npm', ['install', '--production'], options).on('exit', function (code) {
    console.log('exited ' + code);
    
    if (code == 0) {
      spawn('npm', ['rebuild'], options).on('exit', function (code) {
        console.log('exited ' + code);
        
        if (code == 0) {
          callback();
        }
      }).stdout.on('data', function (chunk) {
        console.log(chunk);
      }).setEncoding('utf8');
    }
  }).stdout.on('data', function (chunk) {
    console.log(chunk);
  }).setEncoding('utf8');
};

exports.start = function (src, slug, port) {
  console.log('Starting the Node.JS app in ' + src);

  // TODO: async
  var manifest = require(path.join(src, 'package.json'));

  var options = {
    cwd: src,
    env: {
      HOME: src,
      PORT: port,
      SLUG: slug,
      PATH: [
        path.join(src, 'bin'),
        path.join(src, 'node_modules', '.bin'),
        '/home/danopia/nvm/v0.8.3/bin',
        '/usr/local/bin',
        '/usr/bin',
        '/bin'
      ].join(':')}}
  
  spawn('node', [manifest.main || '.'], options).on('exit', function (code) {
    console.log('exited ' + code);
  }).stdout.on('data', function (chunk) {
    console.log('NodeJS output: ' + chunk);
  }).setEncoding('utf8');
};

