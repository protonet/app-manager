var http = require('http');

var ports = {};
var slugs = {};
var thisPort = 7200;

exports.reservePort = function (slug) {
  var i = 1;
  while (slugs[slug + '-' + i]) i++;
  slug += '-' + i;
  
  slugs[slug] = (thisPort += 1);
  ports[thisPort] = slug;
  return [slug, thisPort];
};

var server = http.createServer(function (req, res) {
  //console.log(req);
  
  var slug = req.headers.host.split('.')[0];
  var port = slugs[slug];
  console.log(req.method + ' ' + req.headers.host + req.url);
  
  if (port) {
    var options = {
      hostname: 'localhost',
      port: port,
      method: req.method,
      path: req.url,
      headers: req.headers};
    
    var requ = http.request(options, function (resp) {
      console.log(resp.statusCode);
      res.writeHead(resp.statusCode, resp.headers);
      resp.on('data', function (chunk) {
        res.write(chunk);
      }).on('end', function () {
        res.end();
      });
    });
    
    req.on('data', function (chunk) {
      requ.write(chunk);
    }).on('end', function () {
      requ.end();
    });
  } else if (req.url == '/') {
    res.writeHead(200, {'content-type': 'text/html'});
    res.write('<!doctype html><html><head><title>App Manager</title></head><body>');
    res.write('<h1>Running Processes</h1><ul>');
    
    Object.keys(ports).forEach(function (port) {
      var slug = ports[port];
      
      res.write('<li><a href="http://' + slug + '.apps.danopia.net/">' + slug + '</a></li>');
    });
    
    res.write('</ul></body></html>');
    res.end();
  } else {
    res.writeHead(404);
    res.end('aint nuttin here');
  }
}).listen(80, function () {
  console.log('Listening for HTTP traffic on port 80');
})
