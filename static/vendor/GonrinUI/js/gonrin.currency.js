//source : https://raw.githubusercontent.com/openexchangerates/accounting.js/master/accounting.js
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
            throw 'gonrin currency requires jQuery to be loaded first';
        }
        factory(jQuery);
    }
}(function ($) {
	'use strict';
	
	var Currency = function (element, options) {
		var gonrin = window.gonrin;
		var grobject = {},
		value,
		text,
		textElement = false,
        input,
		getValue = function(){
        	return value;
        };
        /* --- Internal Helper Methods --- */

    	// Store reference to possibly-available ECMAScript 5 methods for later
    	var nativeMap = Array.prototype.map,
    		nativeIsArray = Array.isArray,
    		toString = Object.prototype.toString;

    	/**
    	 * Tests whether supplied parameter is a string
    	 * from underscore.js
    	 */
    	function isString(obj) {
    		return !!(obj === '' || (obj && obj.charCodeAt && obj.substr));
    	}

    	/**
    	 * Tests whether supplied parameter is an array
    	 * from underscore.js, delegates to ECMA5's native Array.isArray
    	 */
    	function isArray(obj) {
    		return nativeIsArray ? nativeIsArray(obj) : toString.call(obj) === '[object Array]';
    	}

    	/**
    	 * Tests whether supplied parameter is a true object
    	 */
    	function isObject(obj) {
    		return obj && toString.call(obj) === '[object Object]';
    	}

    	/**
    	 * Extends an object with a defaults object, similar to underscore's _.defaults
    	 *
    	 * Used for abstracting parameter handling from API methods
    	 */
    	function defaults(object, defs) {
    		var key;
    		object = object || {};
    		defs = defs || {};
    		// Iterate over object non-prototype properties:
    		for (key in defs) {
    			if (defs.hasOwnProperty(key)) {
    				// Replace values with defaults only if undefined (allow empty/zero values):
    				if (object[key] == null) object[key] = defs[key];
    			}
    		}
    		return object;
    	}

    	/**
    	 * Implementation of `Array.map()` for iteration loops
    	 *
    	 * Returns a new Array as a result of calling `iterator` on each array value.
    	 * Defers to native Array.map if available
    	 */
    	function map(obj, iterator, context) {
    		var results = [], i, j;

    		if (!obj) return results;

    		// Use native .map method if it exists:
    		if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);

    		// Fallback for native .map:
    		for (i = 0, j = obj.length; i < j; i++ ) {
    			results[i] = iterator.call(context, obj[i], i, obj);
    		}
    		return results;
    	}

    	/**
    	 * Check and normalise the value of precision (must be positive integer)
    	 */
    	function checkPrecision(val, base) {
    		val = Math.round(Math.abs(val));
    		return isNaN(val)? base : val;
    	}


    	/**
    	 * Parses a format string or object and returns format obj for use in rendering
    	 *
    	 * `format` is either a string with the default (positive) format, or object
    	 * containing `pos` (required), `neg` and `zero` values (or a function returning
    	 * either a string or object)
    	 *
    	 * Either string or format.pos must contain "%v" (value) to be valid
    	 */
    	function checkCurrencyFormat(format) {
    		var defaults = options.currency.format;

    		// Allow function as format parameter (should return string or object):
    		if ( typeof format === "function" ) format = format();

    		// Format can be a string, in which case `value` ("%v") must be present:
    		if ( isString( format ) && format.match("%v") ) {

    			// Create and return positive, negative and zero formats:
    			return {
    				pos : format,
    				neg : format.replace("-", "").replace("%v", "-%v"),
    				zero : format
    			};

    		// If no format, or object is missing valid positive value, use defaults:
    		} else if ( !format || !format.pos || !format.pos.match("%v") ) {

    			// If defaults is a string, casts it to an object for faster checking next time:
    			return ( !isString( defaults ) ) ? defaults : options.currency.format = {
    				pos : defaults,
    				neg : defaults.replace("%v", "-%v"),
    				zero : defaults
    			};

    		}
    		// Otherwise, assume format was fine:
    		return format;
    	};
    	
    	var notifyEvent = function (e) {
            if ((e.type === 'change.gonrin')  && (e.value && (e.value === e.oldValue)) ) {
                return;
            }
            element.trigger(e);
        };
        
		var onChange = function(){
			var oldvalue = value;
			if(textElement){
				value = ((textElement.val().trim().length !== 0) ? parseFloat(textElement.val().trim()): null);
				notifyEvent({
	                type: 'change.gonrin',
	                value: value,
	                oldValue: oldvalue
	            });
			}
			
		};
		var onFocus = function(){
			if(textElement){
				if(value !== null){
					textElement.val(value);
				}else{
					textElement.val('');
				}
			}
		};
		var onBlur = function(){
			if(value !== null){
				text = formatMoney(value);
				textElement.val(text);
			}
		};
		var unsubscribeEvents = function(){
			if (textElement) {
        		textElement.off({
                    'change': onChange,
                    'blur': onBlur,
                    //'keydown': keydown,
                    'focus': onFocus
                });
        	}
		};
		var subscribeEvents = function(){
			unsubscribeEvents();
			if (textElement) {
        		textElement.on({
                    'change': onChange,
                    'blur': onBlur,
                    //'keydown': keydown,
                    'focus':  onFocus,
                });
        	}
		};
		
    	
    	function setValue(val){
    		var oldvalue = value;
    		value = val;
    		input.val(value);
			
    		if(val !== null){
				text = formatMoney(val);
			}else{
				text = "";
			}
            if(text !== null){
            	textElement.val(text);
            }
            
            notifyEvent({
                type: 'change.gonrin',
                value: value,
                oldValue: oldvalue
            });
            
    	}
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
       
       
		grobject.getValue = getValue;
		grobject.setValue = setValue;
		
		/* --- API Methods --- */

		/**
		 * Takes a string/array of strings, removes all formatting/cruft and returns the raw float value
		 * Alias: `accounting.parse(string)`
		 *
		 * Decimal must be included in the regular expression to match floats (defaults to
		 * accounting.settings.number.decimal), so if the number uses a non-standard decimal 
		 * separator, provide it as the second argument.
		 *
		 * Also matches bracketed negatives (eg. "$ (1.99)" => -1.99)
		 *
		 * Doesn't throw any errors (`NaN`s become 0) but this may change in future
		 */
		var unformat = gonrin.unformat = grobject.unformat = grobject.parse = function(val, decimal) {
			
			// Recursively unformat arrays:
			if (isArray(val)) {
				return map(val, function(v) {
					return unformat(v, decimal);
				});
			}

			// Fails silently (need decent errors):
			val = val || 0;

			// Return the value as-is if it's already a number:
			if (typeof value === "number") return val;

			// Default decimal point comes from settings, but could be set to eg. "," in opts:
			decimal = decimal || options.number.decimal;

			 // Build regex to strip out everything except digits, decimal point and minus sign:
			var regex = new RegExp("[^0-9-" + decimal + "]", ["g"]),
				unformatted = parseFloat(
					("" + val)
					.replace(/\((?=\d+)(.*)\)/, "-$1") // replace bracketed values with negatives
					.replace(regex, '')         // strip out any cruft
					.replace(decimal, '.')      // make sure decimal point is standard
				);

			// This will fail silently which may cause trouble, let's wait and see:
			return !isNaN(unformatted) ? unformatted : 0;
		};
		
		/**
		 * Implementation of toFixed() that treats floats more like decimals
		 *
		 * Fixes binary rounding issues (eg. (0.615).toFixed(2) === "0.61") that present
		 * problems for accounting- and finance-related software.
		 */
		var toFixed = gonrin.toFixed =  grobject.toFixed = function(val, precision) {
			precision = checkPrecision(precision, options.number.precision);

			var exponentialForm = Number(unformat(val) + 'e' + precision);
			var rounded = Math.round(exponentialForm);
			var finalResult = Number(rounded + 'e-' + precision).toFixed(precision);
			return finalResult;
		};
		
		/**
		 * Format a number, with comma-separated thousands and custom precision/decimal places
		 * Alias: `accounting.format()`
		 *
		 * Localise by overriding the precision and thousand / decimal separators
		 * 2nd parameter `precision` can be an object matching `settings.number`
		 */
		var formatNumber = gonrin.formatNumber = grobject.formatNumber = grobject.format = function(number, precision, thousand, decimal) {
			// Resursively format arrays:
			if (isArray(number)) {
				return map(number, function(val) {
					return formatNumber(val, precision, thousand, decimal);
				});
			}

			// Clean up number:
			number = unformat(number);

			// Build options object from second param (if object) or all params, extending defaults:
			var opts = defaults(
					(isObject(precision) ? precision : {
						precision : precision,
						thousand : thousand,
						decimal : decimal
					}),
					options.number
				),

				// Clean up precision
				usePrecision = checkPrecision(opts.precision),

				// Do some calc:
				negative = number < 0 ? "-" : "",
				base = parseInt(toFixed(Math.abs(number || 0), usePrecision), 10) + "",
				mod = base.length > 3 ? base.length % 3 : 0;

			// Format the number:
			return negative + (mod ? base.substr(0, mod) + opts.thousand : "") + base.substr(mod).replace(/(\d{3})(?=\d)/g, "$1" + opts.thousand) + (usePrecision ? opts.decimal + toFixed(Math.abs(number), usePrecision).split('.')[1] : "");
		};
		
		/**
		 * Format a number into currency
		 *
		 * Usage: accounting.formatMoney(number, symbol, precision, thousandsSep, decimalSep, format)
		 * defaults: (0, "$", 2, ",", ".", "%s%v")
		 *
		 * Localise by overriding the symbol, precision, thousand / decimal separators and format
		 * Second param can be an object matching `settings.currency` which is the easiest way.
		 *
		 * To do: tidy up the parameters
		 */
		var formatMoney = gonrin.formatMoney = grobject.formatMoney = function(number, symbol, precision, thousand, decimal, format) {
			// Resursively format arrays:
			if (isArray(number)) {
				return map(number, function(val){
					return formatMoney(val, symbol, precision, thousand, decimal, format);
				});
			}

			// Clean up number:
			number = unformat(number);

			// Build options object from second param (if object) or all params, extending defaults:
			var opts = defaults(
					(isObject(symbol) ? symbol : {
						symbol : symbol,
						precision : precision,
						thousand : thousand,
						decimal : decimal,
						format : format
					}),
					options.currency
				),

				// Check format (returns object with pos, neg and zero):
				formats = checkCurrencyFormat(opts.format),

				// Choose which format to use for this value:
				useFormat = number > 0 ? formats.pos : number < 0 ? formats.neg : formats.zero;

			// Return with currency symbol added:
			return useFormat.replace('%s', opts.symbol).replace('%v', formatNumber(Math.abs(number), checkPrecision(opts.precision), opts.thousand, opts.decimal));
		};
		
		
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
        
        grobject.disable = function () {
            if (textElement){
            	textElement.prop('disabled', true);
            }
            input.prop('disabled', true);
            return grobject;
        };

        grobject.enable = function () {
            if (textElement){
            	textElement.prop('disabled', false);
            }
            input.prop('disabled', false);
            return grobject;
        };
        grobject.readonly = function () {
            if (textElement){
            	textElement.prop('readonly', true);
            }
            return grobject;
        };
        
        
        // initializing element and component attributes
        
        if (element.is('input') ) {
            input = element;
            //value = input.val();
            try {
        		value = (options.value !== null) ? options.value : ((input.val().trim().length !== 0) ? parseFloat(input.val().trim()): null);
			} catch (error) {
				value = null;
			}
			
            
			//value =  (options.value !== null) ? options.value : ((input.val().trim().length !== 0) ? input.val().trim(): null);
  
            var prevEl = element.prev('input');
            if((prevEl.length == 0 ) || !($(prevEl[0]).hasClass('form-control'))){
            	prevEl = $('<input class="form-control" type="text">');
                element.before(prevEl);
            }
            textElement = prevEl;
            
            if( !options.hasOwnProperty("cssClass") ){
            	textElement.addClass("form-control");
            }else if (options.hasOwnProperty("cssClass") && (options["cssClass"] !== false)){
            	textElement.addClass(options.cssClass);
            }
            //tabindex
            if(options.tabindex !== null){
            	textElement.attr("tabindex", options.tabindex);
            }
            
            setValue(value);
            
            element.css("display", "none");
            element.attr("tabindex", -1);
            
            subscribeEvents();
            if (input.prop('disabled')) {
                grobject.disable();
            }
            if (input.prop('readonly')) {
                grobject.readonly();
            }
            
        } else {
            throw new Error('Cannot apply to non input, select element');
        }

    	if(!options.placeholder){
    		options.placeholder = input.attr("placeholder");
    	}
        return grobject;
	};
	
/*****************************************/
	
	$.fn.currency = function (options) {
        return this.each(function () {
            var $this = $(this);
            if (!$this.data('gonrin')) {
                // create a private copy of the defaults object
                options = $.extend(true, {}, $.fn.currency.defaults, options);
                $this.data('gonrin', Currency($this, options));
            }
        });
    };
    $.fn.currency.defaults = {
        //text: "",
        /*The value of the widget.*/
    	value: null,
    	tabindex: null,
    	cssClass: false,
        currency: {
			symbol : "$",		// default currency symbol is '$'
			format : "%s%v",	// controls output: %s = symbol, %v = value (can be object, see docs)
			decimal : ".",		// decimal point separator
			thousand : ",",		// thousands separator
			precision : 2,		// decimal places
			grouping : 3		// digit grouping (not implemented yet)
		},
		number: {
			precision : 0,		// default precision on numbers is 0
			grouping : 3,		// digit grouping (not implemented yet)
			thousand : ",",
			decimal : "."
		}
    };
}));