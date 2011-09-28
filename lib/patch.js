require('connect/lib/patch');

var util = require('util')
  , http = require('http')
  , res = http.OutgoingMessage.prototype;

util.urlDec = function(s) {
  s = String(s).replace(/\+/g, ' ');
  try {
    return decodeURIComponent(s);
  } catch(e) {
    return unescape(s);
  }
};

res.die = function() {
  var res = this
    , args = Array.prototype.slice.call(arguments)
    , status = '200'
    , ctype = 'text/plain';
  if (/^\d{3}\b$/.test(args[0])) {
    status = String(args.shift());
  }
  if (args.length > 1 && /^[\w-]+\/[\w-]+$/.test(args[0])) {
    ctype = args.shift().toLowerCase();
  }
  res.statusCode = status.match(/(\d+)(.*)/)[0];
  res.setHeader('Content-Type', ctype);
  args.forEach(function(data) {
    var type = typeof data;
    if (type == 'string' || Buffer.isBuffer(data)) {
      res.write(data);
    } else
    if (type == 'number' || type == 'boolean') {
      res.write(String(data));
    } else {
      res.write((ctype == 'text/plain') ? util.inspect(data, false, 12) : JSON.stringify(data));
    }
  });
  console.log('res.end()');
  res.end();
};

res.redirect = function() {
  var res = this
    , args = Array.prototype.slice.call(arguments)
    , status = 302;
  if (args.length > 1 && typeof args[0] == 'number') {
    status = args.shift();
  }
  res.statusCode = status;
  res.setHeader('Location', args[0]);
  res.end();
};

res.error = function(reason) {
  var res = this, error = '404 Unable to Satisfy Request';
  switch(reason) {
    case 'bad-request':
      error = '400 Bad Request';
      break;
    case 'unauthorized':
      error = '401 Unauthorized';
      break;
    case 'forbidden':
      error = '403 Forbidden';
      break;
    case 'invalid-range':
      error = '416 Requested Range Not Satisfiable';
      break;
  }
  res.die(error, error);
};

console.debug = function() {
  var args = Array.prototype.slice.call(arguments);
  if (args.length > 1 && typeof args[0] == 'string') {
    console.log(args.shift());
  }
  for (var i = 0; i < args.length; i++) {
    console.log(util.inspect(args[i], false, 12));
  }
};
