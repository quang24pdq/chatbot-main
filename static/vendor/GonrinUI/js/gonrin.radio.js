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
            throw 'gonrin radio requires jQuery to be loaded first';
        }
        factory(jQuery);
    }
}(function ($) {
	'use strict';
	var Radio = function (element, options) {
		var gonrin = window.gonrin;
		var grobject = {},
		value,
		data, //datalist
		index = -1,
        input,
        widgetTemplate = '<ul class="list-unstyled"></ul>',
        itemTemplate =  '<li class="radio-option"><input type="radio" name=""><span class="control-label"></span></li>',
        widget = false,
        dataSourceType,
        /********************************************************************************
         *
         * Private functions
         *
         ********************************************************************************/
        renderData = function(){
			if($.isArray(data) && data.length > 0){
				var name = gonrin.uniqueId("radio_");
				$.each(data, function (idx, item) {
					if (typeof item === 'object') {
						dataSourceType = 'object';
						if((options.valueField != null) && (options.textField != null)){
							var $item = $(itemTemplate);
							var $radio = $item.find('input[type=radio]');
							
							$radio.attr("name", name);
							
							if((!!options.template)&& (!!gonrin.template)){
								var tpl = gonrin.template(options.template);
								$item.find('span').html(tpl(item));
							}else{
								$item.find('span').html(item[options.textField]);
							}
							
							//$item.find('span').text(item[options.textField]);
							if(value === item[options.valueField]){
								$radio.prop('checked', true);
							}
							if((options.cssClassField != null) && (item.hasOwnProperty(options.cssClassField)) && (!!item[options.cssClassField])){
								$item.addClass(item[options.cssClassField]);
							}
							widget.append($item);
							//radio onChange setValue
							
							if(options.readonly !== true){
								$item.bind("click", function(event){
									setIndex(idx);
								});
							}else{
								$item.bind("click", function(event){
									event.stopPropagation();
								});
								$radio.click(function(){
								    return false;
								});
							}
							
							
						}
					}
				});
			}
			return grobject;
		},
        setupWidget = function () {
			if (!!options.dataSource) {
				widget = $(widgetTemplate);
				if(!!options.headerTemplate){
					widget.prepend($("<li>").addClass("radio-header").html(options.headerTemplate))
				}
				
				input.after(widget);
				
				if($.isArray(options.dataSource)){
					data = options.dataSource;
					renderData();
				}
				
            }
			return grobject;
        },
        getValue = function(){
        	return value;
        },
        getIndex = function(){
        	return index;
        },
        setValue = function (val) {
        	if(val === value){
        		return;
        	}
        	var oldvalue = value;
        	value = val;
        	
        	if(data && (data.length > 0)){
        		for(var i = 0; i < data.length; i++){
        			var item = data[i];
        			if(dataSourceType === 'object'){
        				if((options.valueField != null) && (options.textField != null)){
            				if(value === item[options.valueField]){
            					index = i;
            					input.val(value);
            	        		$(widget.find('input[type=radio]')[i]).prop('checked', true);
            					
            	        		notifyEvent({
            	                    type: 'change.gonrin',
            	                    value: value,
            	                    oldValue: oldvalue
            	                });
            					return;
            				}
            			}
        			}
        			
        		}
        		
        	}
        },
        setIndex = function(idx){
        	if(data && (data.length > 0) && (data.length > idx) && (idx > -1)){
        		var item = data[idx];
        		var oldvalue = value;
        		var val;
        		if(dataSourceType === 'object'){
        			if((options.valueField != null) && (options.textField != null)){
            			val = item[options.valueField];
            		}else{
            			return;
            		}
        		}
        		
				index = idx;
				input.val(val);
				value = val;
				
        		$(widget.find('input[type=radio]')[idx]).prop('checked', true);
        		
        		notifyEvent({
                    type: 'change.gonrin',
                    value: val,
                    oldValue: oldvalue
                });
				return;
        	}
        },
        
        dataToOptions = function () {
            var eData,
                data_options = {};

            if (element.is('input') || options.inline) {
                eData = element.data();
            }

            if (eData.data_options && eData.data_options instanceof Object) {
            	data_options = $.extend(true, data_options, eData.data_options);
            }
            return data_options;
        },
        
        notifyEvent = function (e) {
            if ((e.type === 'change.gonrin')  && (e.value && (e.value === e.oldValue)) ) {
                return;
            }
            element.trigger(e);
        },
        
        
        attachElementEvents = function () {
            if(widget){
            	
            }
            
        },
        detach_element_events = function () {
            if(widget){
            	
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
       
		grobject.destroy = function () {
            ///<summary>Destroys the widget and removes all attached event listeners</summary>
          
            detach_element_events();
            widget.remove();
            element.removeData('gonrin');
        };
        
        //grobject.toggle = toggle;
        //grobject.show = show;
        //grobject.hide = hide;
        grobject.setValue = setValue;
        grobject.getValue = getValue;
        grobject.setIndex = setIndex;
        grobject.select = setIndex;
        grobject.getIndex = getIndex;
        
        /*grobject.disable = function () {
            ///<summary>Disables the input element, the component is attached to, by adding a disabled="true" attribute to it.
            ///If the widget was visible before that call it is hidden. Possibly emits dp.hide</summary>
            hide();
            if (component && component.hasClass('btn')) {
                component.addClass('disabled');
            }
            if (textElement){
            	textElement.prop('disabled', true);
            }
            input.prop('disabled', true);
            return grobject;
        };

        grobject.enable = function () {
            ///<summary>Enables the input element, the component is attached to, by removing disabled attribute from it.</summary>
            if (component && component.hasClass('btn')) {
                component.removeClass('disabled');
            }
            if (textElement){
            	textElement.prop('disabled', false);
            }
            input.prop('disabled', false);
            return grobject;
        };*/
        
        grobject.readonly = function (state) {
            ///<summary>Disables the input element, the component is attached to, by adding a disabled="true" attribute to it.
            ///If the widget was visible before that call it is hidden. Possibly emits dp.hide</summary>
            /*hide();
            if (component && component.hasClass('btn')) {
                component.addClass('disabled');
            }
            if (textElement){
            	textElement.prop('readonly', true);
            }*/
            return grobject;
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
        
        
        
        // initializing element and component attributes
        if (element.is('input')) {
            input = element;
            var inputGroupSpan;
            var parentEl = element.parent();
            
            if(parentEl.is('div') && parentEl.hasClass('input-group') && parentEl.hasClass('radio-group')){
            	inputGroupSpan = parentEl;
            }else{
            	element.wrap( '<div class="input-group radio-group"></div>' );
                inputGroupSpan = element.parent();
            }
            
            var widgetEl = element.nextAll('ul:first');
            if(widgetEl.length > 0 ){
            	widgetEl.remove();
            }
            
            element.css("display", "none");
        } else {
            throw new Error('Cannot apply to non input element');
        }

        $.extend(true, options, dataToOptions());
        
        grobject.options(options);
        value =  (options.value !== null) ? options.value : input.val();
        inputGroupSpan.css("width", (options.width !== null) ? options.width : "100%"); 
       
    	setupWidget();
    	
    	if(options.valueField != null){
			if (options.textField === null){
				options.textField = options.valueField;
			}
    	}
    	if((options.index) && (options.index > -1)){
    		grobject.setIndex(options.index);
    	}

        return grobject;
		
	};
	
/*****************************************/
	
	$.fn.radio = function (options) {
		
        return this.each(function () {
            var $this = $(this);
            if (!$this.data('gonrin')) {
                // create a private copy of the defaults object
                options = $.extend(true, {}, $.fn.radio.defaults, options);
                $this.data('gonrin', Radio($this, options));
            }
        });
    };

    $.fn.radio.defaults = {
    	readonly: false,
    	textField: null,
        valueField: null,
        cssClassField: null,
        /*dataSource: The data source of the widget which is used to display a list of values. 
         * Can be a JavaScript object which represents a valid data source configuration, a JavaScript array 
         * or an existing kendo.data.DataSource instance.*/
        dataSource: null,
        enable:true,
        index: -1,
        /*Specifies a static HTML content, which will be rendered as a header of the popup element.*/
        headerTemplate: false,
        /*The template used to render the items. By default the widget displays only the text of the data item (configured via textField).*/
        template: false,
        /*The text of the widget used when the auto_bind is set to false.*/
        text: "",
        /*The value of the widget.*/
        value: null,
        
        width: null,
        height: null,
    };
}));