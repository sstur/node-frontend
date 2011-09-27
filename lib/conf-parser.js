var fs = require('fs');

function appendNode(obj, name, value) {
  if (obj[name] instanceof Array) {
    obj[name].push(value);
  } else
  if (obj[name]) {
    obj[name] = [obj[name], value];
  } else {
    obj[name] = value;
  }
}

function parseLine(lines, line) {
  var node = {name: null, args: []};
  line = line.replace(/\s*;$/, '');
  line.replace(/("|')(.*?)\1|[^\s]+/g, function(val, quote, quoted) {
    if (quoted) {
      val = quoted;
    }
    node.args.push(val);
  });
  if (node.args.length) {
    node.name = node.args.shift();
  }
  if (node.args[node.args.length - 1] == '{') {
    node.args.pop();
    node.block = parseBlock(lines, node);
  }
  return (node.name) ? node : null;
}

function parseBlock(lines, parent) {
  var ast = {};
  while(lines.length) {
    var line = lines.shift();
    line = line.trim();
    if (!line || line.charAt(0) == '#') {
      continue;
    } else
    if (line.match(/\}$/)) {
      return ast;
    }
    var node = parseLine(lines, line);
    if (node) {
      node.__proto__ = {_parent: parent};
      appendNode(ast, node.name, node);
    }
  }
  return ast;
}

exports.parse = function(filePath) {
  var fileData = fs.readFileSync(filePath, 'utf8');
  return parseBlock(fileData.split(/\r\n|[\r\n]/), null);
};
