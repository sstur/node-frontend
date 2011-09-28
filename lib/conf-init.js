//Constants / Helpers
var REG_IPADDR = /^\d+\.\d+\.\d+\.\d+$/;
var REG_BINDING = /^\d+\.\d+\.\d+\.\d+:\d+$/;
var REG_DOMAIN_NAME = /^[a-z0-9-]+(\.[a-z0-9-]+)*$/i;
var REG_DOMAIN_NAME_WILD = /^\*(\.[a-z0-9-]+)*$/i;

module.exports = {
  init: function(engine) {
    var config = engine.config;
    var http = config.getFirstChild('http');
    http.eachChild('server', function(node) {
      var data = node.data();
      //Parse listen directive(s)
      var bindings = data.bindings = [];
      node.getChildAttrs('listen').forEach(function(binding) {
        if (binding == 'default_server') {
          data.is_default = true;
          http.data('default_server', node);
        } else {
          if (binding.match(/[a-z\.]/i) && binding.indexOf(':') < 0) {
            binding = binding + ':80';
          }
          if (binding.match(/^localhost:\d+$/i)) {
            binding = '127.0.0.1:' + binding.replace(/^.*:/, '');
          } else
          if (binding.match(/^(\*:)?\d+$/)) {
            binding = '0.0.0.0:' + binding.replace(/^.*:/, '');
          }
          if (binding.match(REG_BINDING)) {
            bindings.push(binding);
            //TODO: make serverBindings an object containing array of server nodes for quick lookup
            if (engine.serverBindings.indexOf(binding) < 0) {
              engine.serverBindings.push(binding);
            }
          }
        }
      });
      //Parse server_names
      var names = data.server_names = [], regex = data.server_names_regex = [];
      node.getChildAttrs('server_name').forEach(function(name) {
        name = name.toLowerCase();
        if (name.match(REG_DOMAIN_NAME_WILD)) {
          regex.push(new RegExp('^(.+\\.)?' + name.substr(2).replace(/\./g, '\\.') + '$', 'i'));
        } else
        if (name.match(REG_DOMAIN_NAME)) {
          names.push(name);
        }
      });
      console.debug('server block:', data);
    });
  }
};
