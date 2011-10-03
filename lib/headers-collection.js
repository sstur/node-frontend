function HeadersCollection(headers) {
  this._headers = {};
  if (headers) {
    this.addHeaders(headers);
  }
}

HeadersCollection.prototype = {
  addHeader: function(key, value, append) {
    key = key.toLowerCase();
    var headers = this._headers;
    if (headers[key] && append) {
      headers[key].push(value);
    } else {
      headers[key] = [value];
    }
  },
  addHeaders: function(headers, append) {
    var keys = Object.keys(headers);
    for (var i = 0, l = keys.length; i < l; i++) {
      var key = keys[i], values = headers[key];
      for (var j = 0; j < values.length; j++) {
        this.addHeader(key, values[j], append || (j > 0));
      }
    }
  },
  each: function(fn) {
    var headers = this._headers, keys = Object.keys(headers);
    for (var i = 0, l = keys.length; i < l; i++) {
      var key = keys[i], values = headers[key];
      for (var j = 0; j < values.length; j++) {
        fn.call(this, key, values[j]);
      }
    }
  },
  flatten: function(concat) {
    var headers = this._headers, keys = Object.keys(headers), flat = {};
    for (var i = 0, l = keys.length; i < l; i++) {
      var key = keys[i], values = headers[key];
      if (values.length && !concat) {
        flat[key] = values.slice();
      } else {
        flat[key] = values.join(', ');
      }
    }
  }
};
