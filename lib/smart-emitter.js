/**
 * SmartEmitter is an extended EventEmitter that supports the '__any__' event (emitted
 * for any / all events) and supports proxying to/from another EventEmitter;
 */
var EventEmitter = require('events').EventEmitter;

function SmartEmitter() {
  EventEmitter.call(this);
}

SmartEmitter.prototype = Object.create(EventEmitter.prototype);

SmartEmitter.prototype._emit = EventEmitter.prototype.emit;

SmartEmitter.prototype.emit = function(event) {
  var list;
  if (event !== '__any__' && (list = this.listeners('__any__')) && list.length) {
    var args = toArray(arguments);
    args.unshift('__any__');
    this.emit.apply(this, args);
  }
  this._emit.apply(this, arguments);
  if (this._proxy) {
    this._proxy.emit.apply(this._proxy, arguments);
  }
};

SmartEmitter.prototype.proxyEventsTo = function(destination) {
  this._proxy = destination;
};

SmartEmitter.prototype.emitEventsFrom = function(source) {
  source._proxy = this;
  if (!source._emit) {
    source._emit = source.emit;
    source.emit = SmartEmitter.prototype.emit;
  }
};

module.exports = SmartEmitter;


//Helper Functions

function toArray(obj) {
  var len = obj.length, arr = new Array(len);
  for (var i = 0; i < len; i++) {
    arr[i] = obj[i];
  }
  return arr;
}

function sliceArray(array, start) {
  var len = array.length, ret = new Array(len - start);
  for (var i = start; i < len; i++) {
    ret[i - start] = array[i];
  }
  return ret;
}

