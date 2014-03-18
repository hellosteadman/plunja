var TemplateRegistry = function(options) {
	var defaults = {
		locator: function(name, callback) {
			if(typeof(jQuery) != 'undefined') {
				var element = jQuery('script[data-template="' + name + '"]');
				if(element.length > 0) {
					callback(element.html());
					return;
				}
				
				callback(false);
				return;
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
	var registry = {};
	
	for(var key in defaults) {
		self[key] = defaults[key];
	}
	
	function hash(str) {
		var hash = 0, i, chr;
		if (str.length == 0) {
			return hash;
		}
		
		for (i = 0, l = str.length; i < l; i++) {
			chr = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + chr;
			hash |= 0;
		}
		
		return hash;
	};
	
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
		if(typeof(registry[name]) == 'undefined') {
			registry[name] = new Template(name, self.filters);
		}
		
		return registry[name];
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
		var _events = {};
		var _self = {
			render: function(context) {
				_render(context,
					function(html) {
						_fire('render', html);
					}
				);
				
				return _self;
			},
			renderTo: function(obj, context) {
				_render(context,
					function(html) {
						obj.innerHTML = html;
						_fire('render', html);
					}
				);
				
				return _self;
			},
			appendTo: function(obj, context) {
				_render(context,
					function(html) {
						obj.innerHTML += html;
						_fire('render', html);
					}
				);
				
				return _self;
			},
			on: function(evt, callback) {
				if(typeof(_events[evt]) == 'undefined') {
					_events[evt] = {};
				}
				
				var sig = hash(callback.toString());
				if(typeof(_events[evt][sig]) == 'undefined') {
					_events[evt][sig] = callback;
				}
				
				return _self;
			},
			off: function(evt, callback) {
				if(typeof(callback) == 'undefined') {
					_events[evt] = {};
				} else if(typeof(_events[evt]) != 'undefined') {
					var newList = {};
					var sig = hash(callback.toString());
					
					for(var key in _events[evt]) {
						if(key != sig) {
							newList[key] = _events[evt][key];
						}
					}
					
					_events[evt] = newList;
				}
				
				return _self;
			}
		};
		
		function _render(context, callback) {
			function r() {
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
				
				callback(html);
			}
			
			if(typeof(_self._html) != 'undefined') {
				r();
			} else {
				self.locator(name,
					function(html) {
						if(typeof(html) == 'boolean' && !html) {
							throw 'Template ' + name + ' not found';
						}
						
						_self._html = html;
						r();
					}
				);
			}
		}
		
		function _fire(evt, data) {
			if(typeof(_events[evt]) != 'undefined') {
				for(var key in _events[evt]) {
					_events[evt][key](data);
				}
			}
		}
		
		return _self;
	}
	
	return self;
}