var fork = require('child_process').fork,
    path = require('path'),
    
    target = path.dirname(module.filename);

console.log('Starting daemon process...');
var daemon = fork(target, ['daemon']);
daemon.on('message', function (m) {
  console.log('Daemon started.');
  process.exit();
});

