require.paths.unshift(__dirname + '/lib');

require('patch');

var util = require('util')
  , config = require('conf-parser').parse(__dirname + '/nginx.conf');

//var test = config.getFirstChild('http').getFirstChild('server').getProperty('default_type');
//console.dir(test);
////console.log(util.inspect(config.getChild('http').toJSON(), false, null));
//process.exit();

var engine = require('engine').create(config);

engine.on('request', function(req, res) {
  if (~req.url.pathname.toLowerCase().indexOf('/favicon.ico')) {
    res.die(404, 'Not Found');
  } else {
    var serverAddr = req.connection.address();
    console.log('Request: http://' + req.headers.host.split(':')[0] + ':' + serverAddr.port + req.url.href);
  }
});

engine.on('start', function(bindings) {
  bindings.forEach(function(binding) {
    console.log('Listening on ' + binding);
  });
});

engine.start();
