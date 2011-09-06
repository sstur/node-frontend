var httpProxy = require('http-proxy');

var CFG = {
  host: '0.0.0.0',
  port: 3000
};

httpProxy.createServer(function(req, res, proxy) {

  //do some stuff

  proxy.proxyRequest(req, res, {
    host: 'localhost',
    port: 80
  });

}).listen(CFG.port, CFG.host);

console.log('Listening on ' + CFG.host + ':' + CFG.port);
