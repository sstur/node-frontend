require('connect/lib/patch');

var util = require('util')
  , http = require('http')
  , res = http.OutgoingMessage.prototype;

res.die = function() {
  var res = this
    , args = Array.prototype.slice.call(arguments)
    , status = '200'
    , ctype = 'text/plain';
  if (/^\d{3}$/.test(args[0])) {
    status = args.shift();
  }
  if (args.length > 1 && /^[\w-]+\/[\w-]+$/.test(args[0])) {
    ctype = args.shift().toLowerCase();
  }
  res.statusCode = status;
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
  res.end();
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
