//Deprecated

var fs = require('fs')
  , http = require('http')
  , https = require('https')
  , EventEmitter = require('events').EventEmitter;

function Server() {
  EventEmitter.call(this);
  this.servers = [];
  this.on('request', function(req, res) {
    req.https = (req.connection.server instanceof https.Server);
    req.serverAddr = req.connection.server.address();
  });
}

Server.prototype = Object.create(EventEmitter.prototype);

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
  //handle events: ['request', 'connection', 'close', 'checkContinue', 'upgrade', 'clientError']
  proxyEvents(server, this);
  server.listen.apply(server, args);
  this.servers.push(server);
  return this;
};

Server.prototype.close = function() {
  this.servers.forEach(function(server) {
    server.close();
  });
};

function proxyEvents(source, dest) {
  source._proxy = dest;
  if (!source._emit) {
    source._emit = source.emit;
    source.emit = function() {
      this._emit.apply(this, arguments);
      if (this._proxy) {
        this._proxy.emit.apply(this._proxy, arguments);
      }
    };
  }
}

exports.createServer = function(callback) {
  var server = new Server();
  if (callback) {
    server.on('request', callback);
  }
  return server;
};