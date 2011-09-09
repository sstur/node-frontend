var http = require('httpu');
var req = http.get({
  socketPath: '/tmp/node-http-sock',
  path: '/'
}, function(res) {
  res.setEncoding('utf8');
  var data = [];
  res.on('data', function (chunk) {
    data.push(chunk);
  });
  res.on('end', function (chunk) {
    console.log('response: ' + data.join(''));
  });
}).on('error', function(e) {
  console.log('Got error: ' + e.message);
});
