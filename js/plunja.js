/*global escape: true */
/*global console: true */
/*exported TemplateRegistry */

var TemplateRegistry = function(options) {
	var defaults = {
		locator: function(name, callback) {
			if(typeof(jQuery) !== 'undefined') {
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
		},
		tags: {
			'urlencode': {
				endtag: 'endurlencode',
				handler: function(registry, context, value, element) {
					return escape(new Parser(context, registry).parse(element.toString()));
				}
			},
			'for': {
				endtag: 'endfor',
				handler: function(registry, context, value, element) {
					var ex = new RegExp(/^(\w+) in ([\w\.]+)$/);
					var matches = value.trim().match(ex);
					var replaceVar, findVar;
					var newContext;
					var clone = [];

					if(matches && matches.length > 2) {
						replaceVar = matches[1];
						findVar = new Variable(
							matches[2], registry
						).resolve(context);

						if(typeof(findVar) === 'undefined') {
							return '';
						}

						if(findVar && findVar.length) {
							newContext = {};
							for(var key in context) {
								newContext[key] = context[key];
							}

							for(var i = 0; i < findVar.length; i++) {
								newContext[replaceVar] = findVar[i];
								clone.push(
									new Parser(
										newContext, registry
									).parse(
										element.toString()
									)
								);
							}
						}

						return clone.join('');
					}

					throw 'Syntax error in for tag';
				}
			}
		}
	};

	function hash(str) {
		var h = 0, chr;

		if(str.length === 0) {
			return h;
		}

		for(var i = 0, l = str.length; i < l; i++) {
			chr = str.charCodeAt(i);
			h = ((h << 5) - h) + chr;
			h |= 0;
		}

		return h;
	}

	var self = {};
	var registry = {};

	(
		function() {
			for(var key in defaults) {
				self[key] = defaults[key];
			}
		}
	)();

	if(typeof(options) === 'objects') {
		for(var key in options) {
			var f;

			switch(key) {
				case 'filters':
					for(f in options.filters) {
						self.filters[f] = options.filters[f];
					}

					break;
				case 'tags':
					for(f in options.tags) {
						self.tags[f] = options.tags[f];
					}

					break;
				default:
					if(typeof(defaults[key]) === 'undefined') {
						if(typeof(console) !== 'undefined' && typeof(console.warn) !== 'undefined') {
							console.warn('Unrecognised TemplateRegistry option', key);
							continue;
						}
					}

					self[key] = options[key];
			}
		}
	}

	self.get = function(name) {
		if(typeof(registry[name]) === 'undefined') {
			registry[name] = new Template(name, self);
		}

		return registry[name];
	};

	function Variable(name, registry) {
		return {
			name: name,
			resolve: function(context) {
				var dot, dotted;
				var pipe, filter, unfiltered, resolved, subcontext;

				if(typeof(context) === 'undefined') {
					context = {};
				}

				dot = name.indexOf('.');
				if(dot > -1) {
					dotted = name.substr(dot + 1);
					subcontext = context[name.substr(0, dot)];
					return new Variable(dotted, registry).resolve(subcontext);
				}

				pipe = name.indexOf('|');
				if(pipe > -1) {
					filter = registry.filters[name.substr(pipe + 1)];
					if(typeof(filter) === 'undefined') {
						throw 'Filter ' + name.substr(pipe + 1) + ' not found';
					}

					unfiltered = context[name.substr(0, pipe)];
					if(typeof(unfiltered) !== 'undefined') {
						return filter(unfiltered);
					}

					if(typeof(console) !== 'undefined' && typeof(console.warn) !== 'undefined') {
						console.warn('Variable', name, 'not found');
					}

					return '';
				}

				resolved = context[name];
				if(typeof(resolved) !== 'undefined') {
					return resolved;
				}

				if(typeof(console) !== 'undefined' && typeof(console.warn) !== 'undefined') {
					console.warn('Variable', name, 'not found');
				}

				return '';
			}
		};
	}

	function Template(name, registry) {
		var _events = {};
		var _self = {
			render: function(context, createNode) {
				_render(context,
					function(el) {
						_fire('render', el);
					},
					createNode
				);

				return _self;
			},
			renderTo: function(obj, context, createNode) {
				_render(
					context,
					function(el) {
						obj.replaceChild(el);
						_fire('render', el);
					},
					createNode
				);

				return _self;
			},
			appendTo: function(obj, context, createNode) {
				_render
					(context,
					function(el) {
						obj.appendChild(el);
						_fire('render', el);
					},
					createNode
				);

				return _self;
			},
			on: function(evt, callback) {
				if(typeof(_events[evt]) === 'undefined') {
					_events[evt] = {};
				}

				var sig = hash(callback.toString());
				if(typeof(_events[evt][sig]) === 'undefined') {
					_events[evt][sig] = callback;
				}

				return _self;
			},
			off: function(evt, callback) {
				if(typeof(callback) === 'undefined') {
					_events[evt] = {};
				} else if(typeof(_events[evt]) !== 'undefined') {
					var newList = {};
					var sig = hash(callback.toString());

					for(var key in _events[evt]) {
						if(key !== sig) {
							newList[key] = _events[evt][key];
						}
					}

					_events[evt] = newList;
				}

				return _self;
			}
		};

		function _render(context, callback, createNode) {
			function r() {
				callback(
					createNode(
						new Parser(
							context, registry
						).parse(
							_self._html.toString()
						)
					)
				);
			}

			if(typeof(createNode) !== 'function') {
				createNode = function(html) {
					var fragment = document.createDocumentFragment();
					var container = document.createElement('div');

					container.innerHTML = html;
					while (container.firstChild) {
						fragment.appendChild(container.firstChild);
					}

					return fragment;
				};
			}

			if(typeof(_self._html) !== 'undefined') {
				r();
			} else {
				self.locator(name,
					function(html) {
						if(typeof(html) === 'boolean' && !html) {
							throw 'Template ' + name + ' not found';
						}

						_self._html = html;
						r();
					}
				);
			}
		}

		function _fire(evt, data) {
			if(typeof(_events[evt]) !== 'undefined') {
				for(var key in _events[evt]) {
					_events[evt][key](data);
				}
			}
		}

		return _self;
	}

	function Parser(context, registry) {
		if(typeof(context) === 'undefined') {
			context = {};
		}

		return {
			parse: function(html) {
				var variableEx = new RegExp('\\{{2} ?([^\\{\\} ]+) ?\\}{2}');
				var tagsEx = new RegExp('\\{% ?([^% ]+)((?: )[^%]+)? ?%\\}');
				var matches = html.match(tagsEx);
				var variables = {};
				var tag, params, endTagEx, endMatches, lastEndMatch, variable, value;
				var startIndex, endIndex, midHTML;

				while (matches && matches.length > 1) {
					tag = matches[1];
					params = matches[2];
					tag = registry.tags[tag];

					if(typeof(tag) === 'undefined') {
						throw 'Tag ' + matches[1] + ' not found';
					}

					if(typeof(tag.endtag) !== 'undefined') {
						endTagEx = new RegExp('(\\{% ?' + tag.endtag + ' ?%\\}).*');
						endMatches = html.match(endTagEx);

						if(!endMatches || endMatches.length === 0) {
							throw 'Tag ' + matches[1] + ' found, but no ' + tag.endtag + ' found';
						}

						while (endMatches && endMatches.length > 0) {
							lastEndMatch = endMatches[endMatches.length - 1];
							startIndex = html.indexOf(matches[0]) + matches[0].length;
							endIndex = html.lastIndexOf(lastEndMatch) - startIndex;
							midHTML = html.substr(startIndex, endIndex);
							html = html.replace(
								matches[0] + midHTML + lastEndMatch,
								tag.handler(registry, context, params, midHTML)
							);

							break;
						}
					} else {
						html = html.replace(tagsEx, tag(params, html));
					}

					break;
				}

				matches = html.match(variableEx);
				while (matches && matches.length > 1) {
					variable = matches[1];
					if(typeof(variables[variable]) === 'undefined') {
						variables[variable] = new Variable(variable, registry);
					}

					value = variables[variable].resolve(context);
					html = html.replace(variableEx, value);
					matches = html.match(variableEx);
				}

				return html;
			}
		};
	}

	return self;
};
