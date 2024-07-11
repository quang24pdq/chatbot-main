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
            throw 'gonrin numeric requires jQuery to be loaded first';
        }
        factory(jQuery);
    }
}(function ($) {
	'use strict';
	var Numeric = function (element, options) {
		var gonrin = window.gonrin;
		var grobject = {},
		value,
        input,
        tryParseValue = function(str,defaultValue, format) {
            var retValue = defaultValue;
            if(options.format==='i'){
        		try {
        			retValue = parseInt(str);
				} catch (error) {
					retValue = null;
				}
        	}
        	else if(options.format==='f'){
        		try {
        			retValue = parseFloat(str);
				} catch (error) {
					retValue = null;
				}
        	}
            if(isNaN(retValue)){
            	retValue = null;
            }
            return retValue;
        },
		getValue = function(){
        	return tryParseValue(input.val());
        };
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

        // initializing element and component attributes
        
        if (element.is('input') ) {
            input = element;
            //value = input.val();
            value =  (options.value !== null) ? options.value : ((input.val().trim().length !== 0) ? input.val().trim(): null);
            input.val(value);

            //var css = 
            if( !options.hasOwnProperty("cssClass") ){
            	element.addClass("form-control");
            }else if (options.hasOwnProperty("cssClass") && (options["cssClass"] !== false)){
            	element.addClass(options.cssClass);
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
	
	$.fn.numeric = function (options) {
        return this.each(function () {
            var $this = $(this);
            if (!$this.data('gonrin')) {
                // create a private copy of the defaults object
                options = $.extend(true, {}, $.fn.numeric.defaults, options);
                $this.data('gonrin', Numeric($this, options));
            }
        });
    };
    $.fn.numeric.defaults = {
        text: "",
        /*The value of the widget.*/
        format: 'f',
        value: null,
        placeholder: null
    };
}));