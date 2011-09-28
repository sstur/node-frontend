function Node(name, attrs) {
  this.name = String(name);
  this.attrs = (Array.isArray(attrs)) ? attrs : [];
  this.children = [];
  injectIntoProtoChain(this, {_data: {}});
}

Node.prototype = {
  getParentNode: function() {
    return this._parent;
  },
  appendChild: function(node) {
    node.__proto__._parent = this;
    this.children.push(node);
  },
  /**
   * gets child nodes (matching name if specified)
   * @param {String} name
   * @returns {Node}
   */
  getChildNodes: function(name) {
    if (!name) return this.children;
    var selected = [];
    this.children.forEach(function(node) {
      if (node.name == name) selected.push(node);
    });
    return selected;
  },
  /**
   * gets first child node (matching name if specified)
   * @param {String} name
   * @returns {Node}
   */
  getFirstChild: function(name) {
    return this.getChildNodes(name)[0];
  },
  /**
   * iterate child nodes (matching name if specified)
   * @param {String} name
   * @param {Function} fn - takes one param; the child node
   */
  eachChild: function(name, fn) {
    if (typeof name == 'function') {
      fn = name;
      name = null;
    }
    this.getChildNodes(name).forEach(fn);
  },
  /**
   * gets all child attributes (matching name if specified)
   * @param {String} name
   * @returns {Array}
   */
  getChildAttrs: function(name) {
    var attrs = [];
    this.eachChild(name, function(node) {
      attrs = attrs.concat(node.attrs);
    });
    return attrs;
  },

  /**
   * In this data structure, a property is the attributes on a child node or an inherited node specified by name.
   * returns the attributes of the first matched node
   * @param {String} name
   * @returns {String} attrs on named node
   */
  getProperty: function(name, flatten) {
    var node, parent = this;
    while (parent && !node) {
      node = parent.getFirstChild(name);
      parent = parent._parent;
    }
    return (node) ? (flatten ? node.attrs.join(' ') : node.attrs) : null;
  },

  /**
   * Get or set arbitrary data attached to a node
   */
  data: function(n, val) {
    var data = this.__proto__._data, type = typeof n;
    if (type == 'undefined') {
      return data;
    } else
    if (type == 'function') {
      var fn = n;
      Object.keys(data).forEach(function(n) {
        fn.call(data, n, data[n]);
      });
      return data;
    } else
    if (arguments.length == 1) {
      return data[n];
    } else {
      return (data[n] = val);
    }
  },

  toJSON: function() {
    var flat = {
      parent: this._parent && this._parent.name || null,
      name: this.name
    };
    if (this.attrs.length) {
      flat.attrs = this.attrs;
    }
    if (this.children.length) {
      flat.children = this.children.map(function(node) {
        node = node.toJSON();
        delete node.parent;
        return node;
      });
    }
    return flat;
  }
};

function injectIntoProtoChain(obj, inject) {
  inject.__proto__ = obj.__proto__;
  obj.__proto__ = inject;
}

module.exports = {
  createNode: function(name, attrs) {
    return new Node(name, attrs);
  }
};
