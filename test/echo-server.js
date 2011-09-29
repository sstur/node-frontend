var http = require('http')
  , util = require('util');

var server = http.createServer(function(req, res) {
  var connAddr = req.connection.address()
    , host = (req.headers.host) ? req.headers.host.split(':')[0] : connAddr.address;
  if (req.url.match(/^[^?]*\/favicon\.ico(\?.*)?$/i)) {
    res.writeHead(404, {});
    res.end();
  } else {
    console.log('Request: ' + req.url);
    var details = [];
    details.push('Request: http://' + host + ':' + connAddr.port + req.url);
    details.push('Request Headers:');
    details.push(util.inspect(req.headers, false, 12));
    res.writeHead(200, {'Content-Type': 'text/plain', 'Server': 'Node v0.4.x', 'X-Powered-By': 'Node.js'});
    res.end(details.join('\n'));
  }
});

server.listen(8181);
console.log('listening on 0.0.0.0:8181');
