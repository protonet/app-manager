var http = require('http'),

    conf = require('./conf/httpd'),

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

exports.server = http.createServer(function (req, res) {
  //console.log(req);
  
  var name = (req.headers.host || req.headers['X-Forwarded-Host'] || '').split('.')[0];
  var target = apps[name];
  console.log(req.method + ' ' + req.headers.host + req.url);
  
  if (target) {
    var dyno = target.dynos[Math.floor(Math.random() * target.dynos.length)];
    
    var options = {
      hostname: 'localhost',
      port: dyno.port,
      method: req.method,
      path: req.url,
      headers: req.headers};
    
    var requ = http.request(options, function (resp) {
      console.log(resp.statusCode);
      res.writeHead(resp.statusCode, resp.headers);
      resp.pipe(res);
    });
    
    req.pipe(requ);
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
})
