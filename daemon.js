var fork = require('child_process').fork,
    path = require('path'),
    fs   = require('fs');

var cwd     = path.dirname(module.filename);
var pidfile = path.join(cwd, '..', 'tmp', 'pids', 'app-manager.pid');

var start = function () {
  console.log('Starting daemonized process...');
  var daemon = fork(cwd, ['daemon'], {silent: false}); // silent:true kills child
  daemon.on('message', function (m) {
    console.log('Daemon', m ? 'started successfully' : 'failed to start');
    process.exit();
  });

  fs.writeFile(pidfile, daemon.pid);
};

fs.readFile(pidfile, 'utf8', function (err, pid) {
  if (!err) {
    console.log('Existing pidfile found, attempting to signal...');
    process.kill(+pid, 0);
    console.log('Daemon already running. Leaving it alone.');
  } else if (err.code == 'ENOENT') {
    start(); // no pidfile, start up fresh
  } else {
    console.log('Error while reading pidfile:', err);
    process.exit(err.errno);
  };
});

process.on('uncaughtException', function (err) {
  if (err.code == 'ESRCH' && err.syscall == 'kill') {
    console.log('Stale pidfile found, cleaning');
    fs.unlink(pidfile);
    start();
  } else {
    throw err;
  };
});

