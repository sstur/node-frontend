var http = require('http')
  , httpu = require('httpu');

var args = process.argv.slice(2), opts = {};

if (args.length == 1) {
  opts.socketPath = args[0];
} else
if (args.length == 2) {
  opts.host = args[0];
  opts.port = args[1];
} else {
  throw new Error('Invalid Arguments: ' + JSON.stringify(args));
}
opts.path = '/';

var callback = function(res) {
  res.setEncoding('utf8');
  var data = [];
  res.on('data', function (chunk) {
    data.push(chunk);
  });
  res.on('end', function (chunk) {
    console.log('Response: ' + data.join(''));
  });
};

var req = (opts.socketPath) ? httpu.get(opts, callback) : http.get(opts, callback);

//req.on('error', function(e) {
//  throw new Error('Error getting resource.');
//});
