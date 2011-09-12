var util = require('util')
  , http = require('http-multi')
  , httpProxy = require('http-proxy')
  , SmartEmitter = require('smart-emitter');

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
    var i = 0;
    var next = function(err) {
      if (err) {
        return server.errorHandler(err, req, res);
      }
      var middleware = engine.stack[i++];
      if (middleware) {
        middleware.call(engine, req, res, next);
      } else {
        engine.noRoute(req, res);
      }
    };
    next();
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
  var engine = this, server = engine.server, config = engine.config;
  config.http = config.http.block;
  //Walk config for settings and routes
  forEach(config.http.server, function(args, block) {
    var server_block = this;
    block.addresses = [];
    forAllArgs(block.listen, function(binding) {
      if (binding == 'default_server') {
        config.http.defaultServer = server_block;
      } else {
        if (binding.match(/^\d+$/)) {
          binding = '0.0.0.0:' + binding;
        } else
        if (!binding.match(/^\d+\.\d+\.\d+\.\d+:\d+$/)) {
          throw new Error('Unable to bind to ' + binding);
        }
        block.addresses.push(binding);
        if (engine.serverBindings.indexOf(binding) < 0) {
          engine.serverBindings.push(binding);
        }
      }
    });
    var names = [], regex = [];
    forAllArgs(block.server_name, function(name) {
      name = name.toLowerCase();
      if (name.match(/^\*\./)) {
        regex.push(new RegExp('^.+' + name.replace('*', '').replace(/\./g, '\\.') + '$', 'i'));
      } else
      if (name.match(/^[a-z0-9-]+(\.[a-z0-9-]+)*$/i)) {
        names.push(name);
      }
    });
    block.server_names = names;
    block.server_names_regex = regex;
  });
  //TODO: Add middleware for rewrites, manipulating headers, uploads, redirects, etc.
};

Engine.prototype.addServerRoute = function(block) {
};

Engine.prototype.addLocationRoute = function(parent, block) {
};

/**
 * Get server block
 *  choose server block on exact hostname match
 *  choose server block on wildcard match
 *  if exists `default_server` choose that
 * If server match, route based on its location block(s)
 *
 */
Engine.prototype.route = function(req, res, next) {
  var engine = this, server = engine.server, config = engine.config;
  var chosen = engine.chooseLocationBlock(req, res);

  if (!chosen) next();
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end(util.inspect(chosen.block));
};

Engine.prototype.chooseLocationBlock = function(req, res, next) {
  var engine = this, config = engine.config;
  var chosen = engine.chooseServerBlock(req, res);
  var location;

  return location;
};

Engine.prototype.chooseServerBlock = function(req, res) {
  var engine = this, config = engine.config;
  //filter server blocks based on listen address
  var servers = [];
  forEach(config.http.server, function(args, block) {
    var addr = req.serverAddr, list = block.addresses;
    if (~list.indexOf(addr.host + ':' + addr.port) || ~list.indexOf('0.0.0.0:' + addr.port)) {
      servers.push(this);
    }
  });
  console.log('number of server blocks to search: ' + servers.length);
  //console.dir(servers);
  var chosen = [], hostname = req.headers['host'].split(':')[0].toLowerCase();
  if (hostname && hostname.match(/^[a-z0-9-]+(\.[a-z0-9-]+)*$/i)) {
    console.log('checking hostname: ' + hostname);
    //search for exact hostname match
    forEach(servers, function(args, block) {
      block.server_names.forEach(function(name) {
        if (name === hostname) {
          chosen.push(this);
        }
      }, this);
    });
    //search for wildcard hostname match
    forEach(servers, function(args, block) {
      block.server_names_regex.forEach(function(regex) {
        if (regex.test(hostname)) {
          chosen.push(this);
        }
      }, this);
    });
    console.log('found ' + chosen.length + ' matches.');
  }
  chosen = chosen[0];
  if (!chosen && config.http.defaultServer && ~servers.indexOf(config.http.defaultServer)) {
    chosen = config.http.defaultServer;
    console.log('default server block chosen.');
  }
  return chosen;
};

Engine.prototype.noRoute = function(req, res) {
  console.error('404 Not Found: ' + req.url);
  if (res.headerSent) {
    res.socket.destroy();
  } else {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end('404 Not Found');
  }
};

Engine.prototype.errorHandler = function(err, req, res) {
  var msg = err.stack || err.toString();
  console.error(msg);
  if (res.headerSent) {
    res.socket.destroy();
  } else {
    res.writeHead(500, {'Content-Type': 'text/plain'});
    res.end(msg);
  }
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
 * Get value or first element of array
 */
function getFirst(item) {
  return (item instanceof Array) ? item[0] : item;
}

/**
 * Walk value or elements of array
 */
function forEach(item, fn) {
  if (item instanceof Array) {
    item.forEach(function(item) {
      fn.call(item, item.args, item.block);
    });
  } else {
    fn.call(item, item.args, item.block);
  }
}

/**
 * Walk value or elements of array
 */
function forAllArgs(items, fn) {
  forEach(items, function(args, block) {
    args.forEach(fn, this);
  });
}

/**
 * Get array of blocks from one or more items
 */
function getBlocks(items) {
  var blocks = [];
  forEach(items, function(args, block) {
    blocks.push(block);
  });
  return blocks;
}

