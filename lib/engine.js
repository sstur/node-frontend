require('patch');

var url = require('url')
  , util = require('util')
  , http = require('http-multi')
  , httpProxy = require('http-proxy')
  , SmartEmitter = require('smart-emitter');

//Constants / Helpers
var REG_IPADDR = /^\d+\.\d+\.\d+\.\d+$/;
var REG_BINDING = /^\d+\.\d+\.\d+\.\d+:\d+$/;
var REG_DOMAIN_NAME = /^[a-z0-9-]+(\.[a-z0-9-]+)*$/i;
var REG_DOMAIN_NAME_WILD = /^\*(\.[a-z0-9-]+)*$/i;

/**
 * Core Routing Engine
 */
function Engine(config) {
  SmartEmitter.call(this);
  this.config = config;
  this.server = http.createServer();
  this.proxy = new httpProxy.HttpProxy();
  this.serverBindings = [];
  this.stack = []; //middleware stack
  this.configure();
  this.init();
}

Engine.prototype = Object.create(SmartEmitter.prototype);

Engine.prototype.init = function() {
  var engine = this, server = engine.server;
  engine.stack.push(engine.route);
  server.on('request', function (req, res) {
    engine.emit('request', req, res);
    if (res.headerSent) return null;
    //Pre-process request
    req.url = url.parse(req.url);
    req.url.pathname = urlDec(req.url.pathname);
    console.log('decoded pathname: ' + req.url.pathname);
    req.listenAddr = req.listenAddr.address + ':' + req.listenAddr.port;
    req.serverAddr = req.serverAddr.address + ':' + req.serverAddr.port;
    req.headers.host = req.headers.host || req.serverAddr;
    //Invoke Middleware
    getNextHandler(engine, req, res)();
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

Engine.prototype.configure = function() {
  var engine = this, config = engine.config;
  var http = config.getFirstChild('http');
  http.eachChild('server', function(node) {
    var data = node.data();
    //Parse listen directive(s)
    var bindings = data.bindings = [];
    node.getChildAttrs('listen').forEach(function(binding) {
      if (binding == 'default_server') {
        data.is_default = true;
        http.data('default_server', node);
      } else {
        if (binding.match(/[a-z\.]/i) && binding.indexOf(':') < 0) {
          binding = binding + ':80';
        }
        if (binding.match(/^localhost:\d+$/i)) {
          binding = '127.0.0.1:' + binding.replace(/^.*:/, '');
        } else
        if (binding.match(/^(\*:)?\d+$/)) {
          binding = '0.0.0.0:' + binding.replace(/^.*:/, '');
        }
        if (binding.match(REG_BINDING)) {
          bindings.push(binding);
          //TODO: make serverBindings an object containing array of server nodes for quick lookup
          if (engine.serverBindings.indexOf(binding) < 0) {
            engine.serverBindings.push(binding);
          }
        }
      }
    });
    //Parse server_names
    var names = data.server_names = [], regex = data.server_names_regex = [];
    node.getChildAttrs('server_name').forEach(function(name) {
      name = name.toLowerCase();
      if (name.match(REG_DOMAIN_NAME_WILD)) {
        regex.push(new RegExp('^(.+\\.)?' + name.substr(2).replace(/\./g, '\\.') + '$', 'i'));
      } else
      if (name.match(REG_DOMAIN_NAME)) {
        names.push(name);
      }
    });
    console.debug('server block:', data);
  });
};

Engine.prototype.route = function(req, res, next) {
  var engine = this;
  var chosen = engine.chooseLocationBlock(req, res);
  if (chosen) {
    console.debug('chosen:', chosen);
//    console.debug('chosen.__proto__:', chosen.__proto__);
//    var parent = chosen;
//    while (parent && (parent = chosen._parent) && parent.name != 'http') {
//      console.dir(parent);
//    }
  } else {
    console.log('no route match.');
    return next();
  }
  res.die(chosen);
};

/**
 * Choose location block
 *  try based on exact url match
 *  try based on url starting with
 */
Engine.prototype.chooseLocationBlock = function(req, res) {
  var engine = this, config = engine.config, http = config.getFirstChild('http');
  var server = engine.chooseServerBlock(req, res);
  if (!server || !server.getFirstChild('location')) {
    return server;
  }
  var chosen = [], pathname = req.url.pathname;
  console.log('checking pathname: ' + pathname);
  //search for exact location match
  server.eachChild('location', function(node) {
    var loc = node.attrs[0] || '/';
    if (loc === pathname) {
      chosen.push(node);
    }
  });
  //search for prefix match
  if (!chosen.length) {
    server.eachChild('location', function(node) {
      var loc = node.attrs[0] || '/';
      if (loc == '/') {
        chosen.push(node);
      } else
      if (loc.charAt(loc.length - 1) == '/' && pathname.indexOf(loc) == 0) {
        chosen.push(node);
      } else
      if (pathname.indexOf(loc + '/') == 0) {
        chosen.push(node);
      }
    });
  }
  console.log('found ' + chosen.length + ' location block(s).');
  return chosen[0] || server;
};

/**
 * Choose server block
 *  try based on exact hostname match
 *  try based on wildcard match
 *  if exists `default_server` choose that
 */
Engine.prototype.chooseServerBlock = function(req, res) {
  var engine = this, config = engine.config, http = config.getFirstChild('http');
  //filter server blocks based on listen address
  //TODO: optimize selection by getting server blocks from engine.serverBindings[req.listenAddr]
  var servers = http.getChildNodes('server').filter(function(node) {
    return (node.data('bindings').indexOf(req.listenAddr) >= 0);
  });
  console.debug('server blocks to search (' + servers.length + '):', servers);
  var chosen = [], hostname = req.headers.host.split(':')[0].toLowerCase();
  if (hostname.match(REG_DOMAIN_NAME)) {
    console.log('checking hostname: ' + hostname);
    //search for exact hostname match
    servers.forEach(function(node) {
      node.data('server_names').forEach(function(name) {
        if (name === hostname) {
          chosen.push(node);
        }
      });
    });
    //search for wildcard hostname match
    if (!chosen.length) {
      servers.forEach(function(node) {
        node.data('server_names_regex').forEach(function(regex) {
          if (regex.test(hostname)) {
            chosen.push(this);
          }
        });
      });
    }
    console.log('found ' + chosen.length + ' match(es).');
  }
  chosen = chosen[0];
  if (!chosen) {
    var defaultServer = http.data('default_server');
    if (defaultServer && ~servers.indexOf(defaultServer)) {
      chosen = defaultServer;
      console.log('default server block chosen.');
    }
  }
  return chosen;
};

Engine.prototype.noRoute = function(req, res) {
  console.error('404 Not Found: ' + req.url.pathname);
  console.debug('res.headerSent:', res.headerSent);
  if (res.headerSent) {
    res.socket.destroy();
  } else {
    res.die(404, 'Not Found');
  }
};

Engine.prototype.errorHandler = function(err, req, res) {
  var msg = err.stack || err.toString();
  console.error(msg);
  if (res.headerSent) {
    res.socket.destroy();
  } else {
    res.die(404, msg);
  }
};

Engine.prototype.start = function(callback) {
  var engine = this, errors = [];
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
};


exports.create = function(config) {
  return new Engine(config);
};



/**
 * Create Middleware Handler Function `next`
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
 * Decode URL-encoded string
 */
function urlDec(s) {
  s = String(s).replace(/\+/g, ' ');
  try {
    return decodeURIComponent(s);
  } catch(e) {
    return unescape(s);
  }
}

