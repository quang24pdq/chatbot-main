(function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        // AMD is used - Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        factory(require('jquery'));
    } else {
        // Neither AMD nor CommonJS used. Use global variables.
        if (typeof jQuery === 'undefined') {
            throw 'gonrin combobox requires jQuery to be loaded first';
        }
        factory(jQuery);
    }
}(function ($) {
	'use strict';
	var TreeView = function (element, options) {
		var gonrin = window.gonrin;
		var grobject = {},
		pluginName = "treeview",
		template = {
			list: '<ul class="list-group"></ul>',
			item: '<li class="list-group-item"></li>',
			indent: '<span class="indent"></span>',
			icon: '<span class="icon"></span>',
			link: '<a href="#" style="color:inherit;"></a>',
			badge: '<span class="badge"></span>'
		},
		css = '.treeview .list-group-item{cursor:pointer}.treeview span.indent{margin-left:10px;margin-right:10px}.treeview span.icon{width:12px;margin-right:5px}.treeview .node-disabled{color:silver;cursor:not-allowed}',
		_default = {
			options : {
				silent: false,
				ignoreChildren: false
			},
			searchOptions : {
				ignoreCase: true,
				exactMatch: false,
				revealResults: true
			}
		},
		initialized = false,
		elementId = element.attr("id"),
		styleId = null,
		tree = [],
		nodes = [],
		wrapper = null,
		setInitialStates = function (node, level) {
			if (!node[options.nodesField]) return;
			level += 1;
			
			var parent = node;
			//var _this = this;
			$.each(node[options.nodesField], function checkStates(index, node) {

				// nodeId : unique, incremental identifier
				node.nodeId = nodes.length;

				// parentId : transversing up the tree
				node.parentId = parent.nodeId;

				// if not provided set selectable default value
				if (!node.hasOwnProperty('selectable')) {
					node.selectable = true;
				}

				// where provided we should preserve states
				node.state = node.state || {};

				// set checked state; unless set always false
				if (!node.state.hasOwnProperty('checked')) {
					node.state.checked = false;
				}

				// set enabled state; unless set always false
				if (!node.state.hasOwnProperty('disabled')) {
					node.state.disabled = false;
				}

				// set expanded state; if not provided based on levels
				if (!node.state.hasOwnProperty('expanded')) {
					if (!node.state.disabled &&
							(level < options.levels) &&
							(node[options.nodesField] && node[options.nodesField].length > 0)) {
						node.state.expanded = true;
					}
					else {
						node.state.expanded = false;
					}
				}

				// set selected state; unless set always false
				if (!node.state.hasOwnProperty('selected')) {
					node.state.selected = false;
				}

				// index nodes in a flattened structure for use later
				nodes.push(node);

				// recurse child nodes and transverse the tree
				if (node[options.nodesField]) {
					setInitialStates(node, level);
				}
			});
        },

        clickHandler = function (event) {
        	
        	if (!options.enableLinks) event.preventDefault();

    		var target = $(event.target);
    		var node = findNode(target);
    		if (!node || node.state.disabled) return;
    		
    		var classList = target.attr('class') ? target.attr('class').split(' ') : [];
    		if ((classList.indexOf('expand-icon') !== -1)) {

    			toggleExpandedState(node,_default.options);
    			render();
    		}
    		else if ((classList.indexOf('check-icon') !== -1)) {
    			
    			toggleCheckedState(node,_default.options);
    			render();
    		}
    		else {
    			
    			if (node.selectable) {
    				toggleSelectedState(node,_default.options);
    			} else {
    				toggleExpandedState(node,_default.options);
    			}

    			render();
    		}
        },
        findNode = function (target) {
    		var nodeId = target.closest('li.list-group-item').attr('data-nodeid');
    		var node = nodes[nodeId];
    		if (!node) {
    			logError('Error: node does not exist');
    		}
    		return node;
    	},
    	
        toggleExpandedState = function (node, opts) {
    		if (!node) return;
    		setExpandedState(node, !node.state.expanded, opts);
    	},
        setExpandedState = function (node, state, opts) {

    		if (state === node.state.expanded) return;

    		if (state && node[options.nodesField]) {

    			// Expand a node
    			node.state.expanded = true;
    			if (!opts.silent) {
    				element.trigger('nodeExpanded', $.extend(true, {}, node));
    			}
    		}
    		else if (!state) {

    			// Collapse a node
    			node.state.expanded = false;
    			if (!opts.silent) {
    				element.trigger('nodeCollapsed', $.extend(true, {}, node));
    			}

    			// Collapse child nodes
    			/*TODO: check ky proxy*/
    			if (node[options.nodesField] && !options.ignoreChildren) {
    				$.each(node[options.nodesField], function (index, node) {
    					setExpandedState(node, false, opts);
    				});
    			}
    		}
    	},

    	toggleSelectedState = function (node, opts) {
    		if (!node) return;
    		setSelectedState(node, !node.state.selected, opts);
    	},
    	setSelectedState = function (node, state, opts) {
    		if(!options.enableSelect) return;

    		if (state === node.state.selected) return;

    		if (state) {

    			// If multiSelect false, unselect previously selected
    			if (!options.multiSelect) {
    				$.each(findNodes('true', 'g', 'state.selected'), $.proxy(function (index, node) {
    					setSelectedState(node, false, opts);
    				}, this));
    			}

    			// Continue selecting node
    			node.state.selected = true;
    			if (!opts.silent) {
    				element.trigger('nodeSelected', $.extend(true, {}, node));
    			}
    		}
    		else {

    			// Unselect node
    			node.state.selected = false;
    			if (!opts.silent) {
    				element.trigger('nodeUnselected', $.extend(true, {}, node));
    			}
    		}
    	},
    	toggleCheckedState = function (node, opts) {
    		if (!node) return;
    		setCheckedState(node, !node.state.checked, opts);
    	},
    	setCheckedState = function (node, state, opts) {

    		if (state === node.state.checked) return;

    		if (state) {
    			// Check node
    			node.state.checked = true;

    			if (!opts.silent) {
    				element.trigger('nodeChecked', $.extend(true, {}, node));
    			}
    		}
    		else {

    			// Uncheck node
    			node.state.checked = false;
    			if (!opts.silent) {
    				element.trigger('nodeUnchecked', $.extend(true, {}, node));
    			}
    		}
    	},
    	setDisabledState = function (node, state, opts) {

    		if (state === node.state.disabled) return;

    		if (state) {

    			// Disable node
    			node.state.disabled = true;

    			// Disable all other states
    			setExpandedState(node, false, opts);
    			setSelectedState(node, false, opts);
    			setCheckedState(node, false, opts);

    			if (!opts.silent) {
    				element.trigger('nodeDisabled', $.extend(true, {}, node));
    			}
    		}
    		else {

    			// Enabled node
    			node.state.disabled = false;
    			if (!opts.silent) {
    				element.trigger('nodeEnabled', $.extend(true, {}, node));
    			}
    		}
    	},
    	render = function () {
    		if (!initialized) {
    			// Setup first time only components
    			element.addClass(pluginName);
    			wrapper = $(template.list);

    			injectStyle();
    			initialized = true;
    		}
    		element.empty().append(wrapper.empty());
    		// Build tree
    		buildTree(tree, 0);
    	},
    	buildTree = function (nodes, level) {
    		if (!nodes) return;
    		level += 1;
    		
    		$.each(nodes, function addNodes(id, node) {
    			var treeItem = $(template.item)
					.addClass('node-' + elementId)
					.addClass(node.state.checked ? 'node-checked' : '')
					.addClass(node.state.disabled ? 'node-disabled': '')
					.addClass(node.state.selected ? 'node-selected' : '')
					.addClass(node.searchResult ? 'search-result' : '') 
					.attr('data-nodeid', node.nodeId)
					.attr('style', buildStyleOverride(node));
	
				// Add indent/spacer to mimic tree structure
				for (var i = 0; i < (level - 1); i++) {
					treeItem.append(template.indent);
				}
				// Add expand, collapse or empty spacer icons
				var classList = [];
				if (node[options.nodesField]) {
					classList.push('expand-icon');
					if (node.state.expanded) {
						classList.push(options.collapseIcon);
					}
					else {
						classList.push(options.expandIcon);
					}
				}
				else {
					classList.push(options.emptyIcon);
				}
				
				treeItem.append($(template.icon).addClass(classList.join(' ')));
				
				// Add node icon
				if (options.showIcon) {
					
					var classList = ['node-icon'];

					classList.push(node.icon || options.nodeIcon);
					if (node.state.selected) {
						classList.pop();
						classList.push(node.selectedIcon || options.selectedIcon || 
										node.icon || options.nodeIcon);
					}

					treeItem.append($(template.icon).addClass(classList.join(' ')));
				}
				
				// Add check / unchecked icon
				if (options.showCheckbox) {

					var classList = ['check-icon'];
					if (node.state.checked) {
						classList.push(options.checkedIcon); 
					}
					else {
						classList.push(options.uncheckedIcon);
					}

					treeItem.append($(template.icon).addClass(classList.join(' ')));
				}
				
				// Add text
				if (options.enableLinks) {
					// Add hyperlink
					treeItem.append($(template.link).attr('href', node.href).append(node[options.textField]));
				}
				else {
					// otherwise just text
					treeItem.append(node[options.textField]);
				}
				// Add tags as badges
				if (options.showTags && node.tags) {
					$.each(node.tags, function addTag(id, tag) {
						treeItem.append($(template.badge).append(tag));
					});
				}
				
				
				// Add item to the tree
				wrapper.append(treeItem);

				// Recursively add child ndoes
				if (node[options.nodesField] && node.state.expanded && !node.state.disabled) {
					return buildTree(node[options.nodesField], level);
				}
    		});
        	return;
        },
    	buildStyleOverride = function(node){
    		if (node.state.disabled) return '';
    		var color = node.color;
    		var backColor = node.backColor;

    		if (options.highlightSelected && node.state.selected) {
    			if (options.selectedColor) {
    				color = options.selectedColor;
    			}
    			if (options.selectedBackColor) {
    				backColor = options.selectedBackColor;
    			}
    		}

    		if (options.highlightSearchResults && node.searchResult && !node.state.disabled) {
    			if (options.searchResultColor) {
    				color = this.options.searchResultColor;
    			}
    			if (options.searchResultBackColor) {
    				backColor = options.searchResultBackColor;
    			}
    		}
    		
    		return 'color:' + color +
    			';background-color:' + backColor + ';';
    	},
        injectStyle = function () {
    		if (options.injectStyle && !document.getElementById(styleId)) {
    			$('<style type="text/css" id="' + styleId + '"> ' + buildStyle() + ' </style>').appendTo('head');
    		};
        },
        buildStyle = function () {

    		var style = '.node-' + elementId + '{';

    		if (options.color) {
    			style += 'color:' + options.color + ';';
    		}

    		if (options.backColor) {
    			style += 'background-color:' + options.backColor + ';';
    		}

    		if (!options.showBorder) {
    			style += 'border:none;';
    		}
    		else if (options.borderColor) {
    			style += 'border:1px solid ' + options.borderColor + ';';
    		}
    		style += '}';

    		if (options.onhoverColor) {
    			style += '.node-' + elementId + ':not(.node-disabled):hover{' +
    				'background-color:' + options.onhoverColor + ';' +
    			'}';
    		}

    		return css + style;
    	},
    	getNode = function (nodeId) {
    		return nodes[nodeId];
    	},
    	getParent = function (identifier) {
    		var node = identifyNode(identifier);
    		return nodes[node.parentId];
    	},
    	getSiblings = function (identifier) {
    		var node = identifyNode(identifier);
    		var parent = getParent(node);
    		var nodes = parent ? parent.nodes : tree;
    		return nodes.filter(function (obj) {
    				return obj.nodeId !== node.nodeId;
    			});
    	},
    	getSelected = function () {
    		return findNodes('true', 'g', 'state.selected');
    	},
    	getUnselected = function () {
    		return findNodes('false', 'g', 'state.selected');
    	},
    	getExpanded = function () {
    		return findNodes('true', 'g', 'state.expanded');
    	},
    	getCollapsed = function () {
    		return findNodes('false', 'g', 'state.expanded');
    	},
    	getChecked = function () {
    		return findNodes('true', 'g', 'state.checked');
    	},
    	getUnchecked = function () {
    		return findNodes('false', 'g', 'state.checked');
    	},
    	getDisabled = function () {
    		return findNodes('true', 'g', 'state.disabled');
    	},
    	getEnabled = function () {
    		return findNodes('false', 'g', 'state.disabled');
    	},
    	selectNode = function (identifiers, opts) {
    		if(options.enableSelect){
    			forEachIdentifier(identifiers, opts, function (node, opts) {
        			setSelectedState(node, true, opts);
        		});
    			render();
    		}
    		
    	},
    	unselectNode = function (identifiers, opts) {
    		if(options.enableSelect){
    			forEachIdentifier(identifiers, opts, function (node, opts) {
        			setSelectedState(node, false, opts);
        		});

        		render();
    		}
    		
    	},
    	toggleNodeSelected = function (identifiers, opts) {
    		forEachIdentifier(identifiers, opts, function (node, opts) {
    			toggleSelectedState(node, opts);
    		});

    		render();
    	},
    	collapseAll = function (opts) {
    		var identifiers = findNodes('true', 'g', 'state.expanded');
    		forEachIdentifier(identifiers, opts, function (node, opts) {
    			setExpandedState(node, false, opts);
    		});

    		render();
    	},
    	collapseNode = function (identifiers, opts) {
    		forEachIdentifier(identifiers, opts, function (node, opts) {
    			setExpandedState(node, false, opts);
    		});

    		render();
    	},
    	expandAll = function (opts) {
    		opts = $.extend({}, _default.options, opts);

    		if (opts && opts.levels) {
    			expandLevels(tree, opts.levels, opts);
    		}
    		else {
    			var identifiers = findNodes('false', 'g', 'state.expanded');
    			forEachIdentifier(identifiers, opts, function (node, opts) {
    				setExpandedState(node, true, opts);
    			});
    		}

    		render();
    	},
    	expandNode = function (identifiers, opts) {
    		forEachIdentifier(identifiers, opts, function (node, opts) {
    			setExpandedState(node, true, opts);
    			if (node.nodes && (opts && opts.levels)) {
    				expandLevels(node.nodes, opts.levels-1, opts);
    			}
    		});

    		render();
    	},
    	expandLevels = function (nodes, level, opts) {
    		opts = $.extend({}, _default.options, opts);

    		$.each(nodes, function (index, node) {
    			setExpandedState(node, (level > 0) ? true : false, opts);
    			if (node.nodes) {
    				expandLevels(node.nodes, level-1, opts);
    			}
    		});
    	},
    	revealNode = function (identifiers, opts) {
    		forEachIdentifier(identifiers, opts, function (node, opts) {
    			var parentNode = getParent(node);
    			while (parentNode) {
    				setExpandedState(parentNode, true, opts);
    				parentNode = getParent(parentNode);
    			};
    		});

    		render();
    	},
    	toggleNodeExpanded = function (identifiers, opts) {
    		forEachIdentifier(identifiers, opts, function (node, opts) {
    			toggleExpandedState(node, opts);
    		});
    		
    		render();
    	},
    	checkAll = function (opts) {
    		var identifiers = findNodes('false', 'g', 'state.checked');
    		forEachIdentifier(identifiers, opts, function (node, opts) {
    			setCheckedState(node, true, opts);
    		});

    		render();
    	},
    	checkNode = function (identifiers, opts) {
    		forEachIdentifier(identifiers, opts, function (node, opts) {
    			setCheckedState(node, true, opts);
    		});
    		render();
    	},
    	uncheckAll = function (opts) {
    		var identifiers = findNodes('true', 'g', 'state.checked');
    		forEachIdentifier(identifiers, opts, function (node, opts) {
    			setCheckedState(node, false, opts);
    		});

    		render();
    	},
    	uncheckNode = function (identifiers, opts) {
    		forEachIdentifier(identifiers, opts, function (node, opts) {
    			setCheckedState(node, false, opts);
    		});

    		render();
    	},
    	toggleNodeChecked = function (identifiers, opts) {
    		forEachIdentifier(identifiers, opts, function (node, opts) {
    			toggleCheckedState(node, opts);
    		});

    		render();
    	},
    	disableAll = function (opts) {
    		var identifiers = findNodes('false', 'g', 'state.disabled');
    		forEachIdentifier(identifiers, opts, function (node, opts) {
    			setDisabledState(node, true, opts);
    		});

    		render();
    	},
    	disableNode = function (identifiers, opts) {
    		forEachIdentifier(identifiers, opts, function (node, opts) {
    			setDisabledState(node, true, opts);
    		});

    		render();
    	},
    	enableAll = function (opts) {
    		var identifiers = findNodes('true', 'g', 'state.disabled');
    		forEachIdentifier(identifiers, opts, function (node, opts) {
    			setDisabledState(node, false, opts);
    		});

    		render();
    	},
    	enableNode = function (identifiers, opts) {
    		forEachIdentifier(identifiers, opts, function (node, opts) {
    			setDisabledState(node, false, opts);
    		});

    		render();
    	},
    	toggleNodeDisabled = function (identifiers, opts) {
    		forEachIdentifier(identifiers, opts, function (node, opts) {
    			setDisabledState(node, !node.state.disabled, opts);
    		});

    		render();
    	},
    	forEachIdentifier = function (identifiers, opts, callback) {
    		opts = $.extend({}, _default.options, opts);

    		if (!(identifiers instanceof Array)) {
    			identifiers = [identifiers];
    		}

    		$.each(identifiers, function (index, identifier) {
    			callback(identifyNode(identifier), opts);
    		});
    	},
        identifyNode = function (identifier) {
    		return ((typeof identifier) === 'number') ?
    						nodes[identifier] :
    						identifier;
    	},
    	search = function (pattern, opts) {
    		opts = $.extend({}, _default.searchOptions, opts);

    		clearSearch({ render: false });

    		var results = [];
    		if (pattern && pattern.length > 0) {

    			if (opts.exactMatch) {
    				pattern = '^' + pattern + '$';
    			}

    			var modifier = 'g';
    			if (opts.ignoreCase) {
    				modifier += 'i';
    			}

    			results = findNodes(pattern, modifier);

    			// Add searchResult property to all matching nodes
    			// This will be used to apply custom styles
    			// and when identifying result to be cleared
    			$.each(results, function (index, node) {
    				node.searchResult = true;
    			})
    		}

    		// If revealResults, then render is triggered from revealNode
    		// otherwise we just call render.
    		if (opts.revealResults) {
    			revealNode(results);
    		}
    		else {
    			render();
    		}

    		element.trigger('searchComplete', $.extend(true, {}, results));

    		return results;
    	},

    	/**
    		Clears previous search results
    	*/
    	clearSearch = function (opts) {

    		opts = $.extend({}, { render: true }, opts);

    		var results = $.each(findNodes('true', 'g', 'searchResult'), function (index, node) {
    			node.searchResult = false;
    		});

    		if (opts.render) {
    			render();	
    		}
    		
    		element.trigger('searchCleared', $.extend(true, {}, results));
    	},
    	findNodes = function (pattern, modifier, attribute) {
    		modifier = modifier || 'g';
    		attribute = attribute || 'text';
    		return $.grep(nodes, function (node) {
    			var val = getNodeValue(node, attribute);
    			
    			if (typeof val === 'string') {
    				return val.match(new RegExp(pattern, modifier));
    			}
    		});
    	},
    	getNodeValue = function (obj, attr) {
    		var index = attr.indexOf('.');
    		if (index > 0) {
    			var _obj = obj[attr.substring(0, index)];
    			var _attr = attr.substring(index + 1, attr.length);
    			return getNodeValue(_obj, _attr);
    		}
    		else {
    			if (obj.hasOwnProperty(attr)) {
    				return obj[attr].toString();
    			}
    			else {
    				return undefined;
    			}
    		}
    	},
        unsubscribeEvents = function (){
        	element.off('click');
    		element.off('nodeChecked');
    		element.off('nodeCollapsed');
    		element.off('nodeDisabled');
    		element.off('nodeEnabled');
    		element.off('nodeExpanded');
    		element.off('nodeSelected');
    		element.off('nodeUnchecked');
    		element.off('nodeUnselected');
    		element.off('searchComplete');
    		element.off('searchCleared');
        },
        subscribeEvents = function (){
        	unsubscribeEvents();
    		element.on('click', $.proxy(clickHandler, this));

    		if (typeof (options.onNodeChecked) === 'function') {
    			element.on('nodeChecked', options.onNodeChecked);
    		}

    		if (typeof (options.onNodeCollapsed) === 'function') {
    			element.on('nodeCollapsed', options.onNodeCollapsed);
    		}

    		if (typeof (options.onNodeDisabled) === 'function') {
    			element.on('nodeDisabled', options.onNodeDisabled);
    		}

    		if (typeof (options.onNodeEnabled) === 'function') {
    			element.on('nodeEnabled', options.onNodeEnabled);
    		}

    		if (typeof (options.onNodeExpanded) === 'function') {
    			element.on('nodeExpanded', options.onNodeExpanded);
    		}

    		if (typeof (options.onNodeSelected) === 'function') {
    			element.on('nodeSelected', options.onNodeSelected);
    		}

    		if (typeof (options.onNodeUnchecked) === 'function') {
    			element.on('nodeUnchecked', options.onNodeUnchecked);
    		}

    		if (typeof (options.onNodeUnselected) === 'function') {
    			element.on('nodeUnselected', options.onNodeUnselected);
    		}

    		if (typeof (options.onSearchComplete) === 'function') {
    			element.on('searchComplete', options.onSearchComplete);
    		}

    		if (typeof (options.onSearchCleared) === 'function') {
    			element.on('searchCleared', options.onSearchCleared);
    		}
        },
        remove = function () {
    		destroy();
    		//$.removeData(this, pluginName);
    		$('#' + styleId).remove();
    	},
        destroy = function (){
        	if (!initialized) return;

    		wrapper.remove();
    		wrapper = null;

    		// Switch off events
    		unsubscribeEvents();

    		// Reset this.initialized flag
    		initialized = false;
        },
        logError = function (message) {
    		if (window.console) {
    			window.console.error(message);
    		}
    	}
		;
	
		/********************************************************************************
        *
        * Public API functions
        * =====================
        *
        * Important: Do not expose direct references to private objects or the options
        * object to the outer world. Always return a clone when returning values or make
        * a clone when setting a private variable.
        *
        ********************************************************************************/
		grobject.findNode = findNode;
		grobject.toggleExpandedState = toggleExpandedState;
		grobject.setExpandedState = setExpandedState;
		grobject.toggleSelectedState = toggleSelectedState;
		grobject.setSelectedState = setSelectedState;
		grobject.toggleCheckedState = toggleCheckedState;
		grobject.setCheckedState = setCheckedState;
		grobject.setDisabledState = setDisabledState;
		grobject.getNode = getNode;
		grobject.getParent = getParent;
		grobject.getSiblings = getSiblings;
		grobject.getSelected = getSelected;
		grobject.getUnselected = getUnselected;
		grobject.getExpanded = getExpanded;
		grobject.getCollapsed = getCollapsed;
		grobject.getChecked = getChecked;
		grobject.getUnchecked = getUnchecked;
		grobject.getDisabled = getDisabled;
		grobject.getEnabled = getEnabled;
		grobject.selectNode = selectNode;
		grobject.unselectNode = unselectNode;
		grobject.toggleNodeSelected= toggleNodeSelected;
		grobject.collapseAll = collapseAll;
		grobject.collapseNode = collapseNode;
		grobject.expandAll = expandAll;
		grobject.expandNode = expandNode;
		grobject.expandLevels = expandLevels;
		grobject.revealNode = revealNode;
		grobject.toggleNodeExpanded = toggleNodeExpanded;
		grobject.checkAll = checkAll;
		grobject.uncheckAll = uncheckAll;
		grobject.checkNode = checkNode;
		grobject.uncheckNode = uncheckNode;
		grobject.toggleNodeChecked = toggleNodeChecked;
		grobject.disableAll = disableAll;
		grobject.disableNode = disableNode;
		grobject.enableAll = enableAll;
		grobject.enableNode = enableNode;
		grobject.toggleNodeDisabled = toggleNodeDisabled;
		grobject.identifyNode = identifyNode;
		grobject.search = search;
		grobject.clearSearch = clearSearch;
		grobject.findNodes = findNodes;
		grobject.getNodeValue = getNodeValue;
		
        grobject.options = function (newOptions) {
            if (arguments.length === 0) {
                return $.extend(true, {}, options);
            }

            if (!(newOptions instanceof Object)) {
                throw new TypeError('options() options parameter should be an object');
            }
            $.extend(true, options, newOptions);
            return grobject;
        };

        // initializing element
        if (options.data) {
			if (typeof options.data === 'string') {
				options.data = $.parseJSON(options.data);
			}
			tree = $.extend(true, [], options.data);
		}
        elementId = element.id;
        styleId = elementId + '-style';
        destroy();
		subscribeEvents();
		var treeWrap = {};
		treeWrap[options.nodesField] = tree;
		setInitialStates(treeWrap, 0);
        render();
        return grobject;
	};
	
/*****************************************/
	
	$.fn.treeview = function (options) {
        return this.each(function () {
            var $this = $(this);
            if (!$this.data('gonrin')) {
                // create a private copy of the defaults object
                options = $.extend(true, {}, $.fn.treeview.defaults, options);
                $this.data('gonrin', TreeView($this, options));
            }
        });
    };
    $.fn.treeview.defaults = {
		injectStyle: true,

		levels: 2,

		expandIcon: 'glyphicon glyphicon-triangle-right',
		collapseIcon: 'glyphicon glyphicon-triangle-bottom',
		emptyIcon: 'glyphicon',
		nodeIcon: '',
		selectedIcon: '',
		checkedIcon: 'glyphicon glyphicon-check',
		uncheckedIcon: 'glyphicon glyphicon-unchecked',

		color: undefined, // '#000000',
		backColor: undefined, // '#FFFFFF',
		borderColor: undefined, // '#dddddd',
		onhoverColor: '#F5F5F5',
		selectedColor: '#FFFFFF',
		selectedBackColor: '#428bca',
		searchResultColor: '#D9534F',
		searchResultBackColor: undefined, //'#FFFFFF',

		enableLinks: false,
		highlightSelected: true,
		highlightSearchResults: true,
		showBorder: true,
		showIcon: true,
		showCheckbox: false,
		showTags: false,
		enableSelect:true,
		multiSelect: false,
		
		nodesField: "nodes",
		textField: "text",
		silent: false,

		// Event handlers
		onNodeChecked: undefined,
		onNodeCollapsed: undefined,
		onNodeDisabled: undefined,
		onNodeEnabled: undefined,
		onNodeExpanded: undefined,
		onNodeSelected: undefined,
		onNodeUnchecked: undefined,
		onNodeUnselected: undefined,
		onSearchComplete: undefined,
		onSearchCleared: undefined
    };
}));