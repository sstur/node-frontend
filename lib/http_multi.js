var http = require('http')
  , EventEmitter = require('events').EventEmitter;

function Server() {
  var server = this;
  server.reqHandler = function(req, res) {
    //req.serverAddr = this.address();
    //req.serverAddr = req.connection.server.address();
    console.log('requested url: ' + req.url);
    server.emit('request', req, res);
  };
}

Server.prototype = Object.create(EventEmitter.prototype);

Server.prototype.listen = function() {
  var server = http.createServer(this.reqHandler);
  server.listen.apply(server, arguments);
  if (this.servers) {
    this.servers.push(server);
  } else {
    this.servers = [server];
  }
  return this;
};

exports.createServer = function(fn) {
  var server = new Server();
  if (fn) {
    server.on('request', fn);
  }
  return server;
};
