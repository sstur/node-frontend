var path = require('path')
  , static = require('static');

//Constants / Helpers
var REG_IPADDR = /^\d+\.\d+\.\d+\.\d+$/;
var REG_BINDING = /^\d+\.\d+\.\d+\.\d+:\d+$/;
var REG_DOMAIN_NAME = /^[a-z0-9-]+(\.[a-z0-9-]+)*$/i;

function Router(engine, req, res) {
  this.req = req;
  this.res = res;
  this.engine = engine;
}

Router.prototype = {
  route: function(done) {
    var engine = this.engine, req = this.req, res = this.res;
    var chosen = this.chooseLocationBlock(req, res);
    if (!chosen) {
      console.log('no route match.');
      return done();
    }
    console.debug('chosen:', chosen);
    var staticFileRoot, proxyPass;
    if ((staticFileRoot = chosen.getProperty('root', true))) {
      //return engine.serveStaticFile(staticFileRoot);
      staticFileRoot = path.join(engine.basePath, staticFileRoot);
      var indexFiles = chosen.getProperty('index'), indexFallback;
      if (indexFiles && indexFiles.length > 1 && indexFiles[indexFiles.length - 1].charAt(0) == '/') {
        indexFallback = indexFiles.pop();
      }
      var pathname = req.url.pathname.replace('/', '')
        , endsWithSlash = (!pathname || pathname.charAt(pathname.length - 1) == '/')
        , files = [];
      if (indexFiles && endsWithSlash) {
        files = indexFiles.map(function(file) {
          return path.join(staticFileRoot, pathname, file);
        });
      } else {
        files = [path.join(staticFileRoot, pathname)];
      }
      //TODO: static.validateRequest(root, path)
      static.trySendFiles({
        req: req,
        res: res,
        files: files,
        callback: function(err) {
          if (err && err.isDirectory && !endsWithSlash) {
            res.redirect(301, req.pathname + '/');
          } else {
            done(err);
          }
        }
      });
    } else
    if ((proxyPass = chosen.getProperty('proxy_pass'))) {
      //return engine.serveStaticFile(staticFileRoot);
      res.die(proxyPass);
    }
  },

  /**
   * Choose location block
   *  try based on exact url match
   *  try based on url starting with
   */
  chooseLocationBlock: function() {
    var config = this.engine.config, http = config.getFirstChild('http');
    var server = this.chooseServerBlock();
    if (!server || !server.getFirstChild('location')) {
      return server;
    }
    var chosen = [], req = this.req, pathname = req.url.pathname;
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
  },

  /**
   * Choose server block
   *  try based on exact hostname match
   *  try based on wildcard match
   *  if exists `default_server` choose that
   */
  chooseServerBlock: function() {
    var config = this.engine.config
      , http = config.getFirstChild('http')
      , req = this.req;
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
              chosen.push(node);
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
  }
};


module.exports = {
  Router: Router,
  instantiate: function(engine, req, res) {
    return new Router(engine, req, res);
  }
};
