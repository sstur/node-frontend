/*!
 * Static File Server
 *
 * Based on:
 * Connect v1.7.1 - staticProvider (31 Aug 2011)
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var fs = require('fs')
  , path = require('path')
  , join = path.join
  , utils = require('connect/lib/utils')
  , mime = require('mime');

var oneDay = 86400000; //milliseconds

exports.validateRequest = function(root, pathname) {
  // null byte(s)
  if (~pathname.indexOf('\0')) {
    return {error: 'http', reason: 'bad-request'};
  }
  var absPath = path.join(root, pathname);
  //path resolves to location outside of root
  if (absPath.indexOf(root) !== 0) {
    return {error: 'http', reason: 'forbidden'};
  }
};

exports.trySendFiles = function(opts) {
  var files = opts.files, done = opts.callback;
  var i = 0, count = files.length;
  opts.callback = function next(err) {
    if (err && err.error == 'http') {
      res.error(err);
    } else
    if (err || i == count) {
      done(err);
    } else {
      opts.path = files[i++];
      console.log('try file: ' + opts.path);
      send(opts.req, opts.res, opts);
    }
  };
  opts.callback();
};

/**
 * Attempt to transfer the requested file to `res`.
 *
 * @param {ServerRequest}
 * @param {ServerResponse}
 * @param {Object} options
 * @api private
 */

var send = exports.send = function(req, res, options) {
  options = options || {};

  // setup
  var path = options.path
    , next = options.callback
    , maxAge = options.maxAge || 0
    , ranges = req.headers.range;

  fs.stat(path, function(err, stat) {
    // ENOENT = file/directory does not exist
    if (err) {
      return ('ENOENT' == err.code) ? next() : next(err);
    } else
    if (stat.isDirectory()) {
      return next({isDirectory: true});
    }

    // mime type
    var type = mime.lookup(path);

    var opts = {};

    if (ranges) {
      ranges = utils.parseRange(stat.size, ranges);
      if (ranges) {
        // TODO: stream options
        // TODO: multiple support
        opts.start = ranges[0].start;
        opts.end = ranges[0].end;
        res.statusCode = 206;
        res.setHeader('Content-Range', 'bytes ' + opts.start + '-' + opts.end + '/' + stat.size);
      } else {
        return next({error: 'http', reason: 'invalid-range'});
      }
    } else {
      res.setHeader('Content-Length', stat.size);
      if (!res.getHeader('Cache-Control')) res.setHeader('Cache-Control', 'public, max-age=' + (maxAge / 1000));
      if (!res.getHeader('Last-Modified')) res.setHeader('Last-Modified', stat.mtime.toUTCString());
      if (!res.getHeader('ETag')) res.setHeader('ETag', utils.etag(stat));

      // conditional GET support
      if (utils.conditionalGET(req)) {
        if (!utils.modified(req, res)) {
          return utils.notModified(res);
        }
      }
    }

    // header fields
    if (!res.getHeader('content-type')) {
      var charset = mime.charsets.lookup(type);
      res.setHeader('Content-Type', type + (charset ? '; charset=' + charset : ''));
    }
    res.setHeader('Accept-Ranges', 'bytes');

    // transfer
    if (req.method == 'HEAD') return res.end();

    // stream
    var stream = fs.createReadStream(path, opts);
    req.emit('sendFile', stream);
    stream.pipe(res);

    //TODO: ?
    //req.socket.on('error', next);
  });
};
