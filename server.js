require.paths.unshift(__dirname + '/lib');

var util = require('util')
  , config = require('conf-parser').parse(__dirname + '/nginx.conf');

//console.log(util.inspect(config, false, null));
//process.exit();

var engine = require('engine').create(config);

engine.on('request', function(req, res) {
  console.log(req.url);
});

engine.on('start', function(bindings) {
  bindings.forEach(function(binding) {
    console.log('Listening on ' + binding);
  });
});

engine.start();
