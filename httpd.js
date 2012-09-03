var http = require('http'),

    conf = require('./conf/httpd'),
    
    pending  = {},
    next_seq = 0,

    ports = {},
    apps  = {},
    thisPort = conf.basePort;

exports.reservePort = function (dyno) {
  if (!apps[dyno.app.name])
    apps[dyno.app.name] = {info: dyno.app, dynos: []};

  thisPort++;
  dyno.port = thisPort;
  apps[dyno.app.name].dynos.push(dyno);
  ports[thisPort] = dyno;
  return thisPort;
};

exports.hookRpc = function (amqp) {
  exports.amqp     = amqp;
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
    
    req.headers['x-user-id'] = message.result.user_id || -1;
    req.headers['x-stranger-id'] = message.result.stranger_id || -1;
    
    req.headers.host = req.headers['x-forwarded-host'];
    req.headers['x-forwarded-host'] = undefined;
    
    var dyno = target.dynos[Math.floor(Math.random() * target.dynos.length)];
    
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
    req.pipe(requ);
  });
};

exports.server = http.createServer(function (req, res) {
  var host = req.headers['x-forwarded-host'] || req.headers.host || '';
  var name = host.split('.')[0];
  var target = apps[name];
  console.log(req.method, host, req.url);
  
  if (target) {
    var cookies = {};
    req.headers.cookie && req.headers.cookie.split(';').forEach(function (cookie) {
      var parts = cookie.split('=');
      cookies[parts[0].trim()] = (parts[1] || '').trim();
    });
    var session = cookies[conf.cookie];
  
    next_seq += 1;
    pending[next_seq] = [target, req, res];
    req.pause();
    exports.amqp.publish('rpc.requests', {
      object: 'auth',
      method: 'check_session',
      params: {cookie: session},
      seq: next_seq
    });
    console.log('sent session verification request');

  } else if (req.url == '/') {
    res.writeHead(200, {'content-type': 'text/html'});
    res.write('<!doctype html><html>');
    res.write('<head><title>App Manager</title></head>');
    res.write('<body><h1>Running Apps</h1><ul>');
    
    Object.keys(apps).forEach(function (name) {
      var info = apps[name];
      
      res.write('<li><a href="http://' + name + '.' + conf.baseName + '/">' + name + '</a> (' + info.dynos.length + ')</li>');
    });
    
    res.write('</ul></body></html>');
    res.end();
  } else {
    res.writeHead(404, {'content-type': 'text/plain'});
    res.end("ain't nuttin' here");
  }
});

exports.server.listen(thisPort, function () {
  console.log('Listening for HTTP traffic on port ' + thisPort + ', http://apps.' + conf.baseName + ':' + thisPort + '/');
});
