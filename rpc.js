var amqp = require('amqp');

exports.start = function (object) {
  exports.object = object;
  
  var conn = exports.conn = amqp.createConnection(null, {defaultExchangeName: 'app-manager'});

  conn.on('ready', function () {
    require('./httpd').hookRpc(conn);
    
		exports.exchange = conn.exchange('app-manager');
		exports.exchange.on('open', function () {
      conn.queue('app-manager-rpc', function (queue) {
        queue.bind('app-manager', 'rpc');
        
        queue.subscribe(function (message) {
          var text = message.data.toString('utf8');
          try {
            var data = JSON.parse(text);
          } catch (err) {
            return console.log('Encountered', err, 'while parsing received JSON:', text);
          }
          
          console.log(data);
          var meth = object[data.method];
          meth && meth(data.params, function (err, res) {
            console.log([err, res]);
            var resp = JSON.parse(JSON.stringify(data));
            resp.error = err;
            resp.result = res;
            exports.exchange.publish(data.queue, JSON.stringify(resp));
          });
        });
      });
    });
    
    console.log('Connected to RabbitMQ');
  });
};
