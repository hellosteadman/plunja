var TemplateRegistry = function(options) {
	var defaults = {
		locator: function(name) {
			if(typeof(jQuery) != 'undefined') {
				var element = jQuery('script[data-template="' + name + '"]');
				if(element.length > 0) {
					return element.html();
				}
				
				return false;
			}
			
			throw 'Locator not defined';
		},
		filters: {
			uppercase: function(text) {
				return text.toUpperCase();
			},
			lowercase: function(text) {
				return text.toLowerCase();
			}
		}
	}
	
	var self = {};
	for(var key in defaults) {
		self[key] = defaults[key];
	}
	
	if(typeof(options) == 'objects') {
		for(var key in options) {
			switch(key) {
				case 'filters':
					for(var f in options.filters) {
						self.filters[f] = options.filters[f];
					}
					
					break;
				default:
					if(typeof(defaults[key]) == 'undefined') {
						if(typeof(console) != 'undefined' && typeof(console.warn) != 'undefined') {
							console.warn('Unrecognised TemplateRegistry option', key);
							continue;
						}
					}
					
					self[key] = options[key];
			}
		}
	}
	
	self.get = function(name) {
		return new Template(name, self.filters);
	};
	
	function Variable(name, filters) {
		return {
			name: name,
			resolve: function(context) {
				var dot, dotted;
				var pipe, filter, unfiltered, resolved, subcontext;
				
				if(typeof(context) == 'undefined') {
					context = {};
				}
				
				dot = name.indexOf('.');
				if(dot > -1) {
					// Find a variable within a parent context object,
					// and create a new Variable object to parse the name
					
					dotted = name.substr(dot + 1);
					subcontext = context[name.substr(0, dot)];
					
					return Variable(dotted, filters).resolve(subcontext);
				}
				
				pipe = name.indexOf('|');
				if(pipe > -1) {
					// Pipe the variable name through a function that transforms the parsed data
					filter = filters[name.substr(pipe + 1)];
					if(typeof(filter) == 'undefined') {
						throw 'Filter ' + name.substr(pipe + 1) + ' not found';
					}
					
					unfiltered = context[name.substr(0, pipe)];
					if(typeof(unfiltered) != 'undefined') {
						return filter(unfiltered);
					}
					
					console.warn('Variable', name, 'not found');
					return '';
				}
				
				// Take the variable name from the context
				resolved = context[name];
				if(typeof(resolved) != 'undefined') {
					return resolved;
				}
				
				if(typeof(console) != 'undefined' && typeof(console.warn) != 'undefined') {
					console.warn('Variable', name, 'not found');
				}
				
				return '';
			}
		}
	}
	
	function Template(name, filters) {
		var element;
		var ex = new RegExp(/\{\{ ?([^{} ]+) ?\}\}/);
		var _self = {
			render: function(context) {
				var html = _self._html.toString();
				var matches = html.match(ex);
				var variables = {};
				var variable, value;
				
				if(typeof(context) == 'undefined') {
					context = {};
				}
				
				while(matches && matches.length > 1) {
					variable = matches[1];
					if(typeof(variables[variable]) == 'undefined') {
						variables[variable] = Variable(variable, filters);
					}
					
					value = variables[variable].resolve(context);
					html = html.replace(ex, value);
					matches = html.match(ex);
				}
				
				return html;
			}
		};
		
		_self._html = self.locator(name);
		if(typeof(_self._html) == 'boolean' && !_self._html) {
			throw 'Template ' + name + ' not found';
		}
		
		return _self;
	}
	
	return self;
}