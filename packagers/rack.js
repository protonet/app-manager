var path  = require('path'),
    fs    = require('fs'),
    spawn = require('child_process').spawn;

exports.name = 'Ruby on Rack';
exports.id = 'rack';
exports.magics = ['config.ru'];

exports.getSlug = function (src) {
  return path.basename(path.dirname(src));
}

exports.assemble = function (src, callback) {
  console.log('Assembling the Ruby on Rack app in ' + src);
  
  // TODO: copy in a bundler
  
  var options = {
    cwd: src,
    env: {
      HOME: src,
      GEM_PATH: path.join(src, 'vendor', 'bundle', 'ruby', '1.9.1') + ':/var/lib/gems/1.9.1',
      GEM_HOME: path.join(src, 'vendor', 'bundle', 'ruby', '1.9.1'),
      PATH: [
        path.join(src, 'vendor', 'bundle', 'ruby', '1.9.1', 'bin'),
        '/usr/local/bin',
        '/usr/bin',
        '/bin'
      ].join(':')}}
  
  spawn('bundle', ['install', '--deployment'], options).on('exit', function (code) {
    console.log('exited ' + code);
    
    if (code == 0) {
      
      // remove the OS repo 
      options.env.GEM_PATH = options.env.GEM_HOME;
      
      spawn('gem', ['install', 'thin', 'bundler'], options).on('exit', function (code) {
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
  console.log('Starting the Ruby on Rack app in ' + src);

  var options = {
    cwd: src,
    env: {
      HOME: src,
      PORT: port,
      SLUG: slug,
      GEM_PATH: path.join(src, 'vendor', 'bundle', 'ruby', '1.9.1'),
      GEM_HOME: path.join(src, 'vendor', 'bundle', 'ruby', '1.9.1'),
      PATH: [
        path.join(src, 'vendor', 'bundle', 'ruby', '1.9.1', 'bin'),
        '/usr/local/bin',
        '/usr/bin',
        '/bin'
      ].join(':')}}
  
  spawn('thin', ['--rackup', 'config.ru', '--port', port, 'start'], options).on('exit', function (code) {
    console.log('exited ' + code);
  }).stdout.on('data', function (chunk) {
    console.log('Thin output: ' + chunk);
  }).setEncoding('utf8');
};

