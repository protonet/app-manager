var path  = require('path'),
    spawn = require('child_process').spawn,

    httpd = require('./httpd');

var Dyno = function (app, type) {
  var i = 1;
  if (!app.dynos[type]) app.dynos[type] = {};
  while (app.dynos[type][i]) i++;

  this.app = app;
  this.type = type;
  this.id = i;
  this.name = app + '[' + type + '.' + i + ']';
  
  app.dynos[type][i] = this;

  this.log('Created');
};

Dyno.prototype.log = function (line) {
	var stamp = new Date();
	var hour  = stamp.getHours();
	var min   = stamp.getMinutes();
	var sec   = stamp.getSeconds();

	if (min < 10) min = '0' + min;
	if (sec < 10) sec = '0' + sec;

  console.log([hour, min, sec].join(':') + ' ' + this.name + ': ' + line);
};

Dyno.prototype.run = function (argv, callback) {
  var env = JSON.parse(JSON.stringify(this.app.config.env));
  env.APP_NAME = this.app.name;
  env.PORT = this.port;
  //env.COMMIT_HASH = 1234567;
  //env.DATABASE_URL = "type://user:pass@host/database";
  //env.LAST_GIT_BY = 
  env.STACK = "app-manager-0.0.1";
  //env.URL = "http://localhost:7200/" + slug;

  this.command = this.app.config.procs[this.type];
  this.command = this.command.replace("$PORT", env.PORT);
  this.command = this.command.replace("$RAILS_ENV", env.RAILS_ENV);
  if (argv) this.command += " " + argv;
  this.command = this.command.split(" ");
  var opts = {cwd: this.app.slug, env: env};
  
  this.proc = spawn(this.command[0], this.command.slice(1), opts);
  
  callback(null, this.name + ': ' + "Starting");
  
  this.proc.on("exit", function () {
    callback(null, this.name + ': ' + "App crashed");
  });

  this.proc.stdout.on("data", function (data) {
    callback(null, this.name + ': ' + data);
  }).setEncoding("utf8");
  
  this.proc.stderr.on("data", function (data) {
    callback(null, this.name + ': ' + data);
  }).setEncoding("utf8");
}

exports.start = function (app, proc, params, callback) {
  var dyno = new Dyno(app, proc);

  if (proc == 'web')
    httpd.reservePort(dyno);
  
  dyno.run(params, callback);
};