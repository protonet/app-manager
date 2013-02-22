var fork = require('child_process').fork,
    path = require('path'),
    fs   = require('fs');

var cwd     = path.dirname(module.filename);
var pidfile = path.join(cwd, '..', 'tmp', 'pids', 'app-manager.pid');

fs.readFile(pidfile, 'utf8', function (err, pid) {
  if (!err) {
    fs.unlink(pidfile);
    process.kill(+pid);
    console.log('Sent kill signal to', +pid);
  } else if (err.code == 'ENOENT') {
    console.log('No pidfile found. Is the daemon running?');
    process.exit(1);
  } else {
    console.log('Error while reading pidfile:', err);
    process.exit(err.errno);
  };
});

process.on('uncaughtException', function (err) {
  if (err.code == 'ESRCH' && err.syscall == 'kill') {
    console.log('Stale pidfile found, cleaning');
  } else {
    throw err;
  };
});

