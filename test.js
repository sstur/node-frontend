var http = require('./lib/http_multi');
var exec = require('child_process').exec;

var server = http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
});

server.listen(8080, '127.0.0.1', function(err) {
  if (err) throw err;
  var listen = this.address();
  console.log('Server running at http://' + listen.address + ':' + listen.port + '/');
});
server.listen(1337, function(err) {
  if (err) throw err;
  var listen = this.address();
  console.log('Server running at http://' + listen.address + ':' + listen.port + '/');
});
server.listen('/tmp/node-http-sock', function(err) {
  if (err) throw err;
  var listen = this.address();
  console.log('Server running at http://unix:' + listen.address + '/');
});

setTimeout(function() {
  console.log('executing test_client ...');
  var cmd = 'node ' + __dirname + '/test_client.js';
  exec(cmd, function (error, stdout, stderr) {
    console.log('test_client completed.');
    //console.dir({stdout: stdout, stderr: stderr, error: error});
  });
}, 1000);
