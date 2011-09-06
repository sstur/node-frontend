var engine = require('engine');
var config = require('conf_parser').parse(__dirname + '/nginx.conf');

engine.init(config);

engine.on('request', function(req, res) {
  console.log(req.url);
});

engine.start();
