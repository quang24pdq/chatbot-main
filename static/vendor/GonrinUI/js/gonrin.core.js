(function (root, factory) {

  "use strict";
  if (typeof define === "function" && define.amd) {
    // AMD. Register as an anonymous module.
    define(["jquery"], factory);
  } else if (typeof exports === "object") {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory(require("jquery"));
  } else {
    // Browser globals (root is window)
    root.gonrin = factory(root.jQuery);
  }

}(this, function init($, undefined) {

	"use strict";
  
	// our public object; augmented after our private API
	var grexports = {};
	
	var __slice = [].slice;
  
	var idCounter = 0;
	grexports.uniqueId = function(prefix) {
		var id = ++idCounter + '';
		return prefix ? prefix + id : id;
	};
  
	grexports.uuid = function() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
		});
	};
	
	["every", "some", "filter", "reduce", "map"].forEach(function(key) {
	      return grexports[key] = function() {
	    	  var args, array;
	    	  array = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
	    	  return array[key].apply(array, args);
	      };
	});
	
    grexports.keys = Object.keys;
    grexports.isArray = Array.isArray;
    grexports.result = function(obj, key) {
    	if (obj == null) {
    		obj = {};
    	}
    	if (utils.getType(obj[key]) === "Function") {
    		return obj[key]();
    	} else {
    		return obj[key];
    	}
    };
    grexports.detect = function(array, fn) {
    	var item, _i, _len;
    	for (_i = 0, _len = array.length; _i < _len; _i++) {
    		item = array[_i];
    		if (fn(item)) {
    			return item;
    		}
    	}
    };
    grexports.reject = function(array, fn) {
    	var item, _i, _len, _results;
    	_results = [];
    	for (_i = 0, _len = array.length; _i < _len; _i++) {
    		item = array[_i];
    		if (!fn(item)) {
    			_results.push(item);
    		}
    	}
    	return _results;
    };
    grexports.intersection = function(array1, array2) {
    	var item, _i, _len, _results;
    	_results = [];
    	for (_i = 0, _len = array1.length; _i < _len; _i++) {
    		item = array1[_i];
    		if (array2.indexOf(item) !== -1) {
    			_results.push(item);
    		}
    	}
    	return _results;
    };
    grexports.isEqual = function(a, b) {
    	return JSON.stringify(a) === JSON.stringify(b);
    };
    
    grexports.isObjectEqual = function(a, b) {
	    // Create arrays of property names
	    var aProps = Object.getOwnPropertyNames(a);
	    var bProps = Object.getOwnPropertyNames(b);

	    // If number of properties is different,
	    // objects are not equivalent
	    if (aProps.length != bProps.length) {
	        return false;
	    }

	    for (var i = 0; i < aProps.length; i++) {
	        var propName = aProps[i];

	        // If values of same property are not equal,
	        // objects are not equivalent
	        if (a[propName] !== b[propName]) {
	            return false;
	        }
	    }

	    // If we made it this far, objects
	    // are considered equivalent
	    return true;
	};
	
 // Return a sorted list of the function names available on the object.
    // Aliased as `methods`
    grexports.functions = grexports.methods = function(obj) {
    	var names = [];
    	for (var key in obj) {
    		if (grexports.isFunction(obj[key])) names.push(key);
    	}
    	return names.sort();
    };
    
    
    // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
    // IE 11 (#1621), and in Safari 8 (#1929).
    if (typeof /./ != 'function' && typeof Int8Array != 'object') {
    	grexports.isFunction = function(obj) {
    		return typeof obj == 'function' || false;
    	};
    }
    
    grexports.mixin = function(obj) {
        $.each(grexports.functions(obj), function(name) {
        	var func = grexports[name] = obj[name];
        	grexports.prototype[name] = function() {
        		var args = [this._wrapped];
        		push.apply(args, arguments);
        		return result(this, func.apply(grexports, args));
        	};
        });
    }
	//By default, Gonrin uses ERB-style template delimiters, change the
	// following template settings to use alternative delimiters.
	grexports.templateSettings = {
		  evaluate    : /{%([\s\S]+?)%}/g,
		  interpolate : /{{([\s\S]+?)}}/g,
		  escape      : /{{-([\s\S]+?)}}/g
	};

	// When customizing `templateSettings`, if you don't want to define an
	// interpolation, evaluation or escaping regex, we need one that is
	// guaranteed not to match.
	var noMatch = /(.)^/;

	// Certain characters need to be escaped so that they can be put into a
	// string literal.
	var escapes = {
			"'":      "'",
			'\\':     '\\',
			'\r':     'r',
			'\n':     'n',
			'\u2028': 'u2028',
			'\u2029': 'u2029'
	};

	var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

	var escapeChar = function(match) {
		return '\\' + escapes[match];
	};
  	grexports.template = function(text, settings, oldSettings) {
		  if (!settings && oldSettings) settings = oldSettings;
		  //settings = gonrin.defaults({}, settings, gonrin.template_settings);
		  settings = $.extend({}, settings, grexports.templateSettings);
	  
		  // Combine delimiters into one regular expression via alternation.
		  var matcher = RegExp([
		       (settings.escape || noMatch).source,
		       (settings.interpolate || noMatch).source,
		       (settings.evaluate || noMatch).source
		  ].join('|') + '|$', 'g');
	
		  // Compile the template source, escaping string literals appropriately.
		  var index = 0;
		  var source = "__p+='";
		  text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
			  source += text.slice(index, offset).replace(escaper, escapeChar);
			  index = offset + match.length;
	
		      if (escape) {
		    	  source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
		      } else if (interpolate) {
		    	  source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
		      } else if (evaluate) {
		    	  source += "';\n" + evaluate + "\n__p+='";
		      }
		
		      // Adobe VMs need the match returned to produce the correct offest.
		      return match;
		  });
		  source += "';\n";
	
		  // If a variable is not specified, place data values in local scope.
		  if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';
	
		  source = "var __t,__p='',__j=Array.prototype.join," +
	      "print=function(){__p+=__j.call(arguments,'');};\n" +
	      source + 'return __p;\n';
	
		  try {
			  var render = new Function(settings.variable || 'obj', '_', source);
		  } catch (e) {
			  e.source = source;
			  throw e;
		  }
	
		  var template = function(data) {
			  return render.call(this, data, grexports);
		  };
	
		  // Provide the compiled source as a convenience for precompilation.
		  var argument = settings.variable || 'obj';
		  template.source = 'function(' + argument + '){\n' + source + '}';
	
		  return template;
  	};
  	
  	grexports.serializeFormJSON = function ($el) {
  		//
  		//if($el)
        var o = {};
        var a = $el.serializeArray();
        $.each(a, function () {
            if (o[this.name]) {
                if (!o[this.name].push) {
                    o[this.name] = [o[this.name]];
                }
                o[this.name].push(this.value || '');
            } else {
                o[this.name] = this.value || '';
            }
        });
        return o;
    };
  
  	grexports.init = function(_$) {
  		return init(_$ || $);
  	};

  	return grexports;
}));
