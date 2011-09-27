var fs = require('fs')
  , ast = require('conf-ast');

function appendNode(obj, name, value) {
  if (Array.isArray(obj[name])) {
    obj[name].push(value);
  } else
  if (obj[name]) {
    obj[name] = [obj[name], value];
  } else {
    obj[name] = value;
  }
}

function parseLine(lines, line) {
  var name, args = [], node;
  line.replace(/("|')(.*?)\1|[^\s]+/g, function(val, quote, quoted) {
    if (quoted) {
      val = quoted;
    }
    args.push(val);
  });
  if (args.length) {
    name = args.shift();
  }
  if (!name) return null;
  if (args[args.length - 1] == '{') {
    args.pop();
    node = ast.createNode(name, args);
    parseBlock(lines, node);
  } else {
    node = ast.createNode(name, args);
  }
  return node;
}

function parseBlock(lines, parent) {
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
    var node = parseLine(lines, line);
    if (node) {
      parent.appendChild(node);
    }
  }
  return parent;
}

exports.parse = function(filePath) {
  var fileData = fs.readFileSync(filePath, 'utf8');
  var rootNode = ast.createNode('config');
  parseBlock(fileData.split(/\r\n|[\r\n]/), rootNode);
  return rootNode;
};
