var path = require('path')
  , utils = require('connect/lib/utils')
  , urlParse = require('url').parse
  //, httpProxy = require('http-proxy')
  , staticProvider = require('static');

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
    var chosen = req.chosenConfigBlock = this.chooseLocationBlock(req, res);
    if (!chosen) {
      console.log('No route match.');
      return done();
    }
    console.debug('chosen:', chosen);
    if ((req.proxyPass = chosen.getProperty('proxy_pass', true))) {
      console.log('Proxying request ...');
      return this.proxyRequest(done);
    } else
    if ((req.staticFileRoot = chosen.getProperty('root', true))) {
      console.log('Attempting to serve from "' + req.staticFileRoot + '" ...');
      return this.serveStaticFile(done);
    } else {
      console.log('No actionable directive or error in config.');
      done();
    }
  },

  /**
   * Attempt to serve static file based on req.url and staticFileRoot
   *  if no matching file exists, invoke callback
   */
  proxyRequest: function(done) {
    var engine = this.engine, req = this.req, res = this.res;
    var chosen = req.chosenConfigBlock;
    console.log('proxyPass: ' + req.proxyPass);
    var proxyPass = urlParse(req.proxyPass);
    var opts = {
      host: proxyPass.hostname,
      port: proxyPass.port
    };
    //node-http-proxy modifies request headers (!) so if we should save the originals
    req.originalHeaders = utils.merge({}, req.headers);
    //remove client request's host-header
    delete req.headers.host;
    //directive: proxy_set_header
    var setHeaders = chosen.getProperties('proxy_set_header'), headersToSet = {};
    setHeaders.forEach(function(attrs) {
      console.log('proxy_set_header: ' + attrs.flatten());
      if (attrs.length == 2) {
        var key = attrs[0].toLowerCase(), val = attrs[1];
        if (val) {
          headersToSet[key] = req.headers[key] = val;
        } else {
          delete req.headers[key];
        }
      }
    });
    //hook to modify proxy request before sending upstream
    opts.proxyRequestHook = function(req) {
      //modify or remove auto-generated host-header
      if (headersToSet.host) {
        req.setHeader('host', headersToSet.host);
      } else {
        req.removeHeader('host');
      }
    };
    //directive: add_header
    var addHeaders = chosen.getProperties('add_header'), headersToAdd = {};
    addHeaders.forEach(function(attrs) {
      console.log('add_header: ' + attrs.flatten());
      if (attrs.length == 2 && attrs[1]) {
        headersToAdd[attrs[0].toLowerCase()] = attrs[1];
      }
    });
    //directive: proxy_hide_header
    var headersToHide = chosen.getProperties('proxy_hide_header', true);
    //hook to modify proxy response before sending downstream
    opts.proxyResponseHook = function(req, res, out) {
      Object.keys(headersToAdd).forEach(function(key) {
        if (out.headers[key]) {
          out.headers[key] += ', ' + headersToAdd[key];
        } else {
          out.headers[key] = headersToAdd[key];
        }
      });
      headersToHide.forEach(function(key) {
        console.log('proxy_hide_header: ' + key);
        delete out.headers[key.toLowerCase()];
      });
    };
    //TODO: to mimic Nginx's behaviour hook into outgoing request options and set agent = false to prevent connection pooling
    engine.proxy.proxyRequest(req, res, opts);
  },

  /**
   * Attempt to serve static file based on req.url and staticFileRoot
   *  if no matching file exists, invoke callback
   */
  serveStaticFile: function(done) {
    var engine = this.engine, req = this.req, res = this.res;
    var chosen = req.chosenConfigBlock
      , staticFileRoot = req.staticFileRoot;
    var err
      , files = []
      , pathname = req.pathname.replace('/', '')
      , indexFiles = chosen.getProperty('index')
      , indexFallback
      , endsWithSlash = (!pathname || pathname.charAt(pathname.length - 1) == '/');
    //Resolve relative path in staticFileRoot
    if (staticFileRoot.charAt(0) != '/') {
      //TODO: replace engine.basePath with config.data('base_path')
      staticFileRoot = path.join(engine.basePath, staticFileRoot);
    }
    //If last attr in index directive starts with / then it is a fallback rewrite
    if (indexFiles && indexFiles.length > 1 && indexFiles[indexFiles.length - 1].charAt(0) == '/') {
      indexFallback = indexFiles.pop();
    }
    //validate against malformed paths
    if ((err = staticProvider.validateRequest(staticFileRoot, pathname))) {
      return res.error(err.reason);
    }
    if (indexFiles && endsWithSlash) {
      files = indexFiles.map(function(file) {
        return path.join(staticFileRoot, pathname, file);
      });
    } else {
      files = [path.join(staticFileRoot, pathname)];
    }
    staticProvider.trySendFiles({
      req: req,
      res: res,
      files: files,
      callback: function(err) {
        if (err && err.isDirectory && !endsWithSlash) {
          res.redirect(301, req.pathname + '/');
        } else
        if (!err && indexFallback) {
          //TODO: rewrite instead of redirect
          res.redirect(301, indexFallback);
        } else {
          done(err);
        }
      }
    });
  },

  /**
   * Choose location block
   *  try based on exact url match
   *  try based on url starting with
   */
  chooseLocationBlock: function() {
    var req = this.req, pathname = req.pathname;
    var server = req.chosenServerBlock || (req.chosenServerBlock = this.chooseServerBlock());
    if (!server || !server.getFirstChild('location')) {
      return server;
    }
    var chosen = [];
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
