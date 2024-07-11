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
	var TextBox = function (element, options) {
		var gonrin = window.gonrin;
		var grobject = {},
		textElement = false,
		value,
        input,
        notifyEvent = function (e) {
            if ((e.type === 'change.gonrin')  && ((e.value && (e.value === e.oldValue)) || (!e.value && !e.oldValue))) {
                return;
            }
            element.trigger(e);
        },
        getValue = function(){
        	return value;
        },
        setValue = function(val){
        	if (value === val){
        		return;
        	}
        	
        	var oldvalue = value;
        	value = val;
        	input.val(val);
        	notifyEvent({
                type: 'change.gonrin',
                value: val,
                oldValue: oldvalue
            });
        },
        change = function (e) {
            var val = $(e.target).val();
            var parsedDate = val ? val : null;
            setValue(parsedDate);
            e.stopImmediatePropagation();
            return false;
        },
        unsubscribeEvents = function () {
        	if (textElement) {
        		textElement.off({
                    'change': change,
                    //'blur': options.debug ? '' : hideWidget,
                    //'keydown': keydown,
                    //'focus': showWidget
                });
        	}
            
        },
        subscribeEvents = function () {
        	unsubscribeEvents();
        	if (textElement) {
        		textElement.on({
                    'change': change,
                    //'blur': options.debug ? '' : hideWidget,
                    //'keydown': keydown,
                    //'focus':  showWidget,
                });
        	}
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
		grobject.setValue = setValue;
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
        
        if ((element.is('input')) || (element.is('textarea'))) {
            input = element;
            textElement = element;
            //value = input.val();
            value =  (options.value !== null) ? options.value : ((input.val().trim().length !== 0) ? input.val().trim(): null);
            input.val(value);
            //css
            if( !options.hasOwnProperty("cssClass") ){
            	element.addClass("form-control");
            }else if (options.hasOwnProperty("cssClass") && (options["cssClass"] !== false)){
            	element.addClass(options.cssClass);
            }
        } else {
            throw new Error('Cannot apply to non input, textarea element');
        }

    	if(!options.placeholder){
    		options.placeholder = input.attr("placeholder");
    	}
    	subscribeEvents();
        return grobject;
	};
	
/*****************************************/
	
	$.fn.textbox = function (options) {
        return this.each(function () {
            var $this = $(this);
            if (!$this.data('gonrin')) {
                // create a private copy of the defaults object
                options = $.extend(true, {}, $.fn.textbox.defaults, options);
                $this.data('gonrin', TextBox($this, options));
            }
        });
    };
    $.fn.textbox.defaults = {
        text: "",
        /*The value of the widget.*/
        value: null,
        placeholder: null
    };
}));