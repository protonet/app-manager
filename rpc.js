var amqp = require('amqp');

exports.start = function (object) {
  exports.object = object;
  
  var conn = exports.conn = amqp.createConnection(null, {defaultExchangeName: 'rpc'});

  conn.on('ready', function () {
    require('./httpd').hookRpc(conn);
    
		exports.exchange = conn.exchange('app-manager');
    conn.queue('app-manager-rpc', function (queue) {
      queue.bind('app-manager', 'rpc');
      
      queue.subscribe(function (message) {
        var data = JSON.parse(message.data.toString('utf8'));
        console.log(data);
        var meth = object[data.method];
        meth && meth(data.params, function (err, res) {
          console.log([err, res]);
          var resp = JSON.parse(JSON.stringify(data));
          resp.error = err;
          resp.result = res;
          conn.publish(data.queue, JSON.stringify(resp));
        });
      });
    });
    
    console.log('Connected to RabbitMQ');
  });
};
