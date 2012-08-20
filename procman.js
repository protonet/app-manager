var path  = require('path'),
    spawn = require('child_process').spawn,

    httpd = require('./httpd');

exports.startProc = function (app, proc, params, callback) {
  var slug = app.name + '-' + proc + '-1';
  var port = httpd.reservePort(app, {name: slug});
  
  var env = JSON.parse(JSON.stringify(app.config.env));
  env.APP_NAME = app.name;
  env.PORT = port;
  //env.COMMIT_HASH = 1234567;
  //env.DATABASE_URL = "type://user:pass@host/database";
  //env.LAST_GIT_BY = 
  env.STACK = "app-manager-0.0.1";
  env.URL = "http://localhost:7200/" + slug;

  var command = app.config.procs[proc] || proc;
  command = command.replace("$PORT", env.PORT);
  command = command.replace("$RAILS_ENV", env.RAILS_ENV);
  if (params) command += " " + params;
  command = command.split(" ");
  var opts = {cwd: app.slug, env: env};
  
  var proc = spawn(command[0], command.slice(1), opts);
  
  callback(null, slug + ': ' + "Starting");
  
  proc.on("exit", function () {
    callback(null, slug + ': ' + "App crashed");
  });

  proc.stdout.on("data", function (data) {
    callback(null, slug + ': ' + data);
  }).setEncoding("utf8");
  
  proc.stderr.on("data", function (data) {
    callback(null, slug + ': ' + data);
  }).setEncoding("utf8");
};
