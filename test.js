var http = require('./lib/http_multi');
var exec = require('child_process').exec;

var server = http.createServer(function (req, res) {
  console.log('Request: ' + JSON.stringify(req.serverAddr) + ' ' + req.url);
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end(JSON.stringify(req.headers));
});

server.listen(8080, '127.0.0.1', function(err) {
  if (err) throw err;
  var listen = this.address();
  console.log('Server running at http://' + listen.address + ':' + listen.port);
  testConnection(listen.address, listen.port);
});

server.listen(1337, function(err) {
  if (err) throw err;
  var listen = this.address();
  console.log('Server running at http://' + listen.address + ':' + listen.port);
  testConnection(listen.address, listen.port);
});

server.listen('/tmp/node-http-sock', function(err) {
  if (err) throw err;
  var listen = this.address();
  console.log('Server running at http://unix:' + listen.address);
  testConnection(listen.address);
});

function testConnection() {
  var args = Array.prototype.slice.call(arguments);
  args[0] = args[0].match(/^[0\.]+$/) ? '127.0.0.1' : args[0];
  console.log('Testing connection: ' + args.join(':'));
  var cmd = 'node ' + __dirname + '/test_client.js ' + args.join(' ');
  exec(cmd, function (error, stdout, stderr) {
    if (!error && !stderr) {
      console.log('Connection successful: ' + args.join(':'));
    } else {
      if (error) {
        console.log('Connection Threw:');
        throw error;
      }
      console.log('Connection failed:');
      process.stderr.write(stderr);
      process.stdout.write(stdout);
    }
  });
}
