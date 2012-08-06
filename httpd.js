var http = require('http');

var ports = {};
var slugs = {};
var thisPort = 7200;

exports.reservePort = function (slug) {
  if (slugs[slug]) return slugs[slug];
  
  slugs[slug] = (thisPort += 1);
  ports[thisPort] = slug;
  return thisPort;
};

var server = http.createServer(function (req, res) {
  //console.log(req);
  
  var slug = req.url.split('/')[1];
  var port = slugs[slug];
  console.log(req.method + ' ' + req.url);
  
  if (port) {
    var options = {
      hostname: 'localhost',
      port: port,
      method: req.method,
      path: '/' + req.url.split('/').splice(2).join('/'),
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
    res.write('<!doctype html><html><head><title>Running apps</title></head><body>');
    res.write('<table><tr><th>Port</th><th>App</th></tr>');
    
    Object.keys(ports).forEach(function (port) {
      var slug = ports[port];
      
      res.write('<tr><th>' + port + '</th><td><a href="/' + slug + '/">' + slug + '</a></td></tr>');
    });
    
    res.write('</table></body></html>');
    res.end();
  } else {
    res.writeHead(404).end('aint nuttin here');
  }
}).listen(7200, function () {
  console.log('Listening for HTTP traffic on port 7200');
})
