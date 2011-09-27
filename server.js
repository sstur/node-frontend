require.paths.unshift(__dirname + '/lib');

require('patch');

var util = require('util')
  , config = require('conf-parser').parse(__dirname + '/nginx.conf');

//console.log(util.inspect(config, false, null));
//process.exit();

var engine = require('engine').create(config);

engine.on('request', function(req, res) {
  if (req.url.match(/^[^?]*\/favicon\.ico(\?.*)?$/i)) {
    res.die(404, 'Not Found');
  } else {
    var connAddr = req.connection.address();
    var host = (req.headers.host) ? req.headers.host.split(':')[0] : connAddr.address;
    console.log('Request: http://' + host + ':' + connAddr.port + req.url);
  }
});

engine.on('start', function(bindings) {
  bindings.forEach(function(binding) {
    console.log('Listening on ' + binding);
  });
});

engine.start();
