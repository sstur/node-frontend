var http = require('http-multi')
  , httpProxy = require('http-proxy')
  , SmartEmitter = require('smart-emitter');

/**
 * Core Routing Engine
 */
function Engine(config) {
  SmartEmitter.call(this);
  this.config = config;
  this.server = http.createServer();
  this.proxy = new HttpProxy();
  this.serverBindings = [];
  this.init();
}

Engine.prototype = Object.create(SmartEmitter.prototype);

Engine.prototype.init = function() {
  var server = this.server;
  // WebSocket support: tunnel websocket request automatically
  server.on('upgrade', function (req, socket, head) {
    if (req.fwd) {
      server.proxy.proxyWebSocketRequest(req, socket, head, {
        host: req.fwd.host,
        port: req.fwd.port
      });
    }
  });
  server.on('close', function () {
    server.proxy.close();
  });
};

Engine.prototype.start = function(callback) {
  var engine = this, errors = [];
  var count = 0, total = engine.serverBindings.length;
  if (!total) {
    engine.emit('error', 'Nothing to do. Check configuration.');
    return engine;
  }
  if (callback) {
    engine.on('start', callback);
  }
  var next = function(err) {
    if (err) errors.push(err);
    if (++count == total) {
      if (errors.length) {
        engine.emit('error', errors);
      } else {
        engine.emit('start', engine.serverBindings);
      }
    }
  };
  engine.serverBindings.forEach(function(args) {
    args.push(next);
    engine.server.listen.apply(engine.server, args);
  });
};


/**
 * Corresponds to a `server` block in nginx
 */
function Server() {

}

Server.prototype.addHandler = function(location) {

};



exports.create = function(config) {
  return new Engine(config);
};
