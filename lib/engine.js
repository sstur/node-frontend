var engine = require('events').EventEmitter
  , httpProxy = require('http-proxy')
  , servers = [];

function getOrCreateServer(host, port) {
  var server;
  servers.forEach(function(item) {
    if (item.cfg.host == host && item.cfg.port == port) server = item;
  });
  if (!server) {
    server = httpProxy.createServer();
    server.cfg = {host: host, port: port};
    initServer(server);
    servers.push(server);
  }
  return server;
}

function initServer(server) {
  var handlers = [];

  server.addHandler = function(handler) {
    handlers.push(handler);
  };

  function next(req, res) {
    if (handlers.length) {
      handlers.shift()(req, res, next);
    } else {
      res.writeHead(404);
      res.end();
    }
  }

  server.on('request', function(req, res, proxy) {

    req.proxyTo = function(host, port) {
      proxy.proxyRequest(req, res, {host: host, port: port});
    };

    next(req, res);

  });
}

function addInstance(server, instance, locations) {
  //var instances = server.instances || (server.instances = []);
  //instances.push(instance);
  server.addHandler(function(req, res, next) {
    //TODO: iterate through locations and proxy, serve or call next()
  })
}

function addLocation(server, location) {
  var locations = server.locations || (server.locations = []);
  locations.push(location);
}

engine.init = function(config) {
  config.server.forEach(function(instance) {
    var servers = [];
    instance.listen.forEach(function(item) {
      servers.push(getOrCreateServer(item.host, item.port));
    });
    instance.location.forEach(function(location) {
      servers.forEach(function(server) {
        addHandler(server, instance, location);
      });
    });
  });
//  servers.forEach(function(server) {
//    server.on('request', function(req, res) {
//
//    });
//  });
};

engine.on('start', function(errors) {
  if (errors) {
    console.dir('Error starting one or more servers.', errors);
    process.exit();
  } else {
    servers.forEach(function(server) {
      console.log('Listening on ' + server.cfg.host + ':' + server.cfg.port);
    });
  }
});

engine.start = function(callback) {
  var count = 0, total = servers.length, errors = [];
  if (!total) {
    return console.log('Nothing to do. Check configuration.');
  }
  if (callback) engine.on('start', callback);
  function next(err) {
    if (err) errors.push(err);
    if (++count == total) {
      engine.emit('start', errors.length ? errors : null);
    }
  }
  servers.forEach(function(server) {
    server.listen(server.cfg.port, server.cfg.host, next);
  });
};

module.exports = engine;
