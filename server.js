var config = require('conf-parser').parse(__dirname + '/nginx.conf')
  , engine = require('engine').create(config);

engine.on('request', function(req, res) {
  console.log(req.url);
});

engine.on('start', function(bindings) {
  bindings.forEach(function(binding) {
    console.log('Listening on ' + binding[0] + ':' + binding[1]);
  });
});

engine.start();
