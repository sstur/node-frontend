function Node(name, attrs) {
  this.name = String(name);
  this.attrs = (Array.isArray(attrs)) ? attrs : [];
  this.children = [];
}

Node.prototype = {
  addChild: function(node) {
    this.children.push(node);
  },
  /**
   * returns a string of the first property with a given name (child or inherited)
   * @param {String} name
   * @returns {String} space-separated list of attribs on named node
   */
  getProperty: function(name) {

  },

  destroy: function() {}
};

module.exports = {
  createNode: function(name, attrs) {
    return new Node(name, attrs);
  }
};
