require('patch');

var url = require('url')
  , path = require('path')
  , util = require('util')
  , conf = require('conf-init')
  , http = require('http-multi')
  , Router = require('router').Router
  , httpProxy = require('http-proxy')
  , SmartEmitter = require('smart-emitter');

/**
 * Middleware: Create Handler Function `next`
 */
function getNextHandler(engine, req, res) {
  var i = 0;
  return function next(err) {
    if (err) {
      return engine.errorHandler(err, req, res);
    }
    var middleware = engine.stack[i++];
    if (middleware) {
      middleware.call(engine, req, res, next);
    } else {
      engine.noRoute(req, res);
    }
  };
}

/**
 * Core Routing Engine
 */
function Engine(config) {
  SmartEmitter.call(this);
  this.config = config;
  this.basePath = path.join(__dirname, '..');
  this.server = http.createServer();
  this.proxy = new httpProxy.HttpProxy();
  this.serverBindings = [];
  this.stack = []; //middleware stack
  this.init();
}

Engine.prototype = Object.create(SmartEmitter.prototype);

Engine.prototype.init = function() {
  var engine = this, server = engine.server;
  conf.init(engine);
  server.on('request', function (req, res) {
    engine.initRequest(req);
    engine.emit('request', req, res);
    if (!res.headerSent) {
      //Invoke Middleware
      getNextHandler(engine, req, res)();
    }
  });
  server.on('upgrade', function (req, socket, head) {
    // WebSocket support: tunnel websocket request automatically
    if (req.fwd) {
      engine.proxy.proxyWebSocketRequest(req, socket, head, {
        host: req.fwd.host,
        port: req.fwd.port
      });
    } else {
      req.connection.destroy();
    }
  });
  server.on('clientError', function (err) {
    console.error(err.stack || err.toString());
  });
  server.on('close', function () {
    //engine.proxy.close();
  });
};

/**
 * Pre-process Request
 */
Engine.prototype.initRequest = function(req) {
  req.url = url.parse(req.url);
  req.url.pathname = util.urlDec(req.url.pathname);
  //possibly move these two lines to http-multi module
  req.listenAddr = req.listenAddr.address + ':' + req.listenAddr.port;
  req.serverAddr = req.serverAddr.address + ':' + req.serverAddr.port;
  //Normalize host header
  req.headers.host = req.headers.host || req.serverAddr;
};

/**
 * Initialize router and route request
 */
Engine.prototype.route = function(req, res, next) {
  var router = req.router = new Router(this, req, res);
  router.route(next);
};

/**
 * Start server - use http-multi to begin listening on one or more host/port(s)
 */
Engine.prototype.start = function(callback) {
  var engine = this, errors = [];
  //Last chance to push to middleware
  engine.stack.push(engine.route);
  //TODO: consider moving above line elsewhere
  var count = 0, numBindings = engine.serverBindings.length;
  if (!numBindings) {
    engine.emit('error', 'No valid binding to listen on. Check configuration.');
    return engine;
  }
  if (callback) {
    engine.on('start', callback);
  }
  var next = function(err) {
    if (err) errors.push(err);
    if (++count == numBindings) {
      if (errors.length) {
        engine.emit('error', errors);
      } else {
        engine.emit('start', engine.serverBindings);
      }
    }
  };
  engine.serverBindings.forEach(function(binding) {
    var args = binding.split(':').reverse();
    args.push(next);
    engine.server.listen.apply(engine.server, args);
  });
  return engine;
};


/**
 * No middleware handled the request
 */
Engine.prototype.noRoute = function(req, res) {
  console.error('No Route: ' + req.url.pathname);
  if (req.router && req.router.noRoute) {
    req.router.noRoute();
  } else {
    if (res.headerSent) {
      req.socket.destroy();
    } else {
      res.die(404, 'Not Found');
    }
  }
};

/**
 * Middleware emitted an error
 */
Engine.prototype.errorHandler = function(err, req, res) {
  var msg = err.stack || err.toString();
  console.debug('Error:', msg);
  if (res.headerSent) {
    req.socket.destroy();
  } else {
    res.die(500, msg);
  }
};

exports.create = function(config) {
  return new Engine(config);
};

