require.paths.unshift(__dirname + '/lib');

require('patch');

var util = require('util')
  , path = require('path')
  , configParser = require('conf-parser');

var args = process.argv.slice(2);
var configFile = (args[0] && args[0].match(/\.conf$/i)) ? args.shift() : 'nginx.conf';
if (configFile.charAt(0) != '/') {
  configFile = path.join(__dirname, configFile);
}
console.log(configFile);


var controlPort = (args[0] && args[0].match(/^\d+$/)) ? args.shift() : '1081';
if (args[0] && args[0].match(/^(status|reload|stop)$/)) {
  //TODO: contact existing instance listening on controlPort
  process.exit();
} else {
  //TODO: start listening on controlPort
}

var config = configParser.parse(configFile);
config.data('production', (process.env.NODE_ENV == 'production'));
config.data('base_path', path.dirname(configFile));
config.data('ctrl_port', path.dirname(controlPort));

var engine = require('engine').create(config);

engine.on('request', function(req, res) {
  if (~req.pathname.toLowerCase().indexOf('/favicon.ico')) {
    res.die(404, 'Not Found');
  } else {
    var serverAddr = req.connection.address();
    console.log('Request: http://' + req.requestedHost.split(':')[0] + ':' + serverAddr.port + req.url);
  }
});

engine.on('start', function(bindings) {
  bindings.forEach(function(binding) {
    console.log('Listening on ' + binding);
  });
});

engine.start();
