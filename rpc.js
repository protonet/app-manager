var amqp = require('amqp');

exports.start = function (object) {
  exports.object = object;
  
  var conn = exports.conn = amqp.createConnection();

  conn.on('ready', function () {
    conn.queue('rpc.app-manager', function (queue) {
      queue.bind('#');
      
      queue.subscribe(function (message) {
        var data = JSON.parse(message.data.toString('utf8'));
        console.log(data);
        object[data.method](data.params, function (err, res) {
          console.log([err, res]);
          var resp = JSON.parse(JSON.stringify(data));
          resp.error = err;
          resp.result = res;
          conn.publish('rpc.' + data.queue, JSON.stringify(resp));
        });
      });
    });
    
    console.log('Connected to RabbitMQ');
  });
};