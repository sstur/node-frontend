var fs = require('fs')
  , ast = require('conf-ast');

function Parser(data) {
  this.lines = data.split(/\r\n|[\r\n]/);
}

Parser.prototype = {
  parse: function() {
    var rootNodeName = 'config';
    return this.parseBlock(ast.createNode(rootNodeName));
  },
  parseBlock: function(parent) {
    var lines = this.lines;
    while(lines.length) {
      var line = lines.shift();
      //Remove Comments
      line = line.replace(/("|')(.*?)\1|#.*/, function(s) {
        if (s.charAt(0) == '#') return '';
        return s;
      });
      //Remove white-space and semi-colon
      line = line.trim().replace(/\s*;$/, '');
      if (!line) {
        continue;
      } else
      if (line.match(/\}$/)) {
        return parent;
      }
      var node = this.parseLine(line);
      if (node) {
        parent.appendChild(node);
      }
    }
    return parent;
  },
  parseLine: function(line) {
    var name, attrs = [], node;
    line.replace(/("|')(.*?)\1|[^\s]+/g, function(val, quote, quoted) {
      if (quote) {
        val = quoted;
      }
      attrs.push(val);
    });
    if (attrs.length) {
      name = attrs.shift();
    }
    if (!name) return null;
    if (attrs[attrs.length - 1] == '{') {
      attrs.pop();
      node = ast.createNode(name, attrs);
      this.parseBlock(node);
    } else {
      node = ast.createNode(name, attrs);
    }
    return node;
  }
};

exports.parse = function(filePath) {
  var fileData = fs.readFileSync(filePath, 'utf8');
  return new Parser(fileData).parse();
};
