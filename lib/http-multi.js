var fs = require('fs')
  , http = require('http')
  , https = require('https')
  , SmartEmitter = require('smart-emitter');

function Server() {
  SmartEmitter.call(this);
  this.servers = [];
  this.on('request', function(req, res) {
    req.https = (req.connection.server instanceof https.Server);
    req.serverAddr = req.connection.server.address();
  });
}

Server.prototype = Object.create(SmartEmitter.prototype);

Server.prototype.listen = function(opts) {
  var self = this, args = Array.prototype.slice.call(arguments), server;
  if (opts && opts.key && opts.cert) {
    if (!opts.keyData) {
      fs.readFile(opts.key, 'utf8', function(err, data) {
        if (err) throw err;
        opts.keyData = data;
        self.listen.apply(self, args);
      });
      return this;
    }
    if (!opts.certData) {
      fs.readFile(opts.cert, 'utf8', function(err, data) {
        if (err) throw err;
        opts.certData = data;
        self.listen.apply(self, args);
      });
      return this;
    }
    args.shift();
    server = https.createServer(opts, this.reqHandler);
  } else {
    server = http.createServer(this.reqHandler);
  }
  this.emitEventsFrom(server);
  server.listen.apply(server, args);
  this.servers.push(server);
  return this;
};

Server.prototype.getBindings = function() {
  var bindings = [];
  this.servers.forEach(function(server) {
    bindings.push(server.address());
  });
  return bindings;
};

Server.prototype.close = function() {
  this.servers.forEach(function(server) {
    server.close();
  });
};

exports.createServer = function(callback) {
  var server = new Server();
  if (callback) {
    server.on('request', callback);
  }
  return server;
};
