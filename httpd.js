var http = require('http'),

    conf = require('./conf/httpd'),
    
    dyno  = require('./dyno'),
    app   = require('./app'),
    
    pending  = {},
    next_seq = 0,

    ports = {},
    apps  = {},
    thisPort = exports.port = process.env.PORT || conf.basePort;

exports.reservePort = function (dyno) {
  if (!apps[dyno.app.name])
    apps[dyno.app.name] = dyno.app;

  thisPort++;
  dyno.port = thisPort;
  ports[thisPort] = dyno;
  return thisPort;
};

exports.hookRpc = function (amqp) {
  exports.amqp     = amqp;
  exports.exchange = amqp.exchange('rpc');
  exports.exchange.on('open', function () {
    exports.queue    = amqp.queue('app-manager-http-proxy', function () {
      exports.queue.bind('rpc', 'rpc.responses');
    });
    
    exports.queue.subscribeJSON(function(message) {
      message = JSON.parse(message.data);
      
      var data = pending[message.seq];
      if (!data) return;
      pending[message.seq] = undefined;
      
      var target = data[0];
      var req = data[1];
      var res = data[2];
      
      var result = message.result || {};
      req.headers['x-user'] = JSON.stringify(result.user || {});
      req.headers['x-stranger'] = JSON.stringify(result.stranger || {});
      req.headers['x-context'] = JSON.stringify(result.context || {});
      
      var dyno = target.randomDyno('web');
      
      var options = {
        hostname: 'localhost',
        port: dyno.port,
        method: req.method,
        path: req.url,
        headers: req.headers};
      
      var requ = http.request(options, function (resp) {
        res.writeHead(resp.statusCode, resp.headers);
        resp.pipe(res);
      });
      
      req.resume();
      requ.write(req.buffer);
      req.removeAllListeners('data');

      if (req.readable)
        req.pipe(requ);
      else
        requ.end();
    });
  });
};

exports.handle = function (req, res, app) {
  var dynos = app.listDynos('web');
  if (dynos.length == 0) {
    console.log("Starting a dyno of", app.name, "on-demand");
    dyno.start(app, "web", null, function () {
      console.log("Started");
      exports.handle(req, res, apps[app.name]);
    });
    return;
  };
  
  var cookies = {};
  req.headers.cookie && req.headers.cookie.split(';').forEach(function (cookie) {
    var parts = cookie.split('=');
    cookies[parts[0].trim()] = (parts[1] || '').trim();
  });
  var session = cookies[conf.cookie];

  next_seq += 1;
  pending[next_seq] = [app, req, res];
  exports.exchange.publish('rpc.requests', {
    object: 'auth',
    method: 'check_session',
    params: {cookie: session},
    seq: next_seq
  });

  req.pause();
  req.buffer = new Buffer(0);
  req.on('data', function (buff) {
    var nbuff = new Buffer(req.buffer.length + buff.length);
    req.buffer.copy(nbuff);
    buff.copy(nbuff, req.buffer.length);
    req.buffer = nbuff;
  });
  
  return;
};

exports.server = http.createServer(function (req, res) {
  var host = req.headers['x-app'] || req.headers.host || '';
  console.log(req.method, host, req.url);
  
  var name = host.split('.')[0];
  
  if (apps[name]) { // use existing dyno
    return exports.handle(req, res, apps[name]);
  };
  
  app.fromName(name, function (app) {
    if (app) { // lazy dyno booting
      console.log("Starting a dyno of", app.name, "on-demand");
      dyno.start(app, "web", null, function () {
        console.log("Started");
        exports.handle(req, res, apps[app.name]);
      });
    } else if (req.url == '/') {
      res.writeHead(200, {'content-type': 'text/html'});
      res.write('<!doctype html><html>');
      res.write('<head><title>App Manager</title></head>');
      res.write('<body><h1>Running Apps</h1><ul>');
      
      var root = req.headers['x-actual-host'] || req.headers['x-forwarded-host'] || req.headers['host'];
      
      Object.keys(apps).forEach(function (name) {
        var info = apps[name];
        
        var path;
        if (req.headers['x-environment'] == 'development')
          path = root + name + '/';
        else
          path = name + '.' + root;
        
        res.write('<li><a href="http://' + path + '">' + name + '</a> (' + info.dynos.length + ')</li>');
      });
      
      res.write('</ul></body></html>');
      res.end();
    } else {
      res.writeHead(404, {'content-type': 'text/plain'});
      res.end("ain't nuttin' here");
    };
  });
});

exports.server.listen(thisPort, function () {
  console.log('Listening for HTTP traffic on port ' + thisPort + ', http://apps.' + conf.baseName + ':' + thisPort + '/');
});
