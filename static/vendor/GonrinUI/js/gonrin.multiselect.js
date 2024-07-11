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
	var MultiSelect = function (element, options) {
		var gonrin = window.gonrin;
		var grobject = {},
		datalist = [], //datalist
        input,value,
        menu_template = '<ul class="dropdown-menu" style="overflow-y:scroll"></ul>',
        item_template =  '<li><a href="javascript:void(0)"></a></li>',
      
        widget = false,
        
        bind_data = function(){
			console.log(datalist);
			if($.isArray(datalist) && datalist.length > 0){
				$.each(datalist, function (idx, item) {
					var $item = $(item_template);
					$item.find('a').text(item[options.textField]);
					if(value == item[options.valueField]){
						//set_value(item[options.valueField]);
					}
					widget.append($item);
					$item.bind("click", function(){
						//set_value(item[options.valueField]);
					});
				});
			}
		};
		
        /********************************************************************************
         *
         * Private functions
         *
         ********************************************************************************/
       
        console.log(element);
        
        // initializing element and component attributes
        if (element.is('input')) {
            input = element;
            value = input.data("list_value");
            element.wrap( '<span class="input-group open"></span>');
            var inputGroupSpan = element.parent();
            element.css("display", "none");
            
            widget = $(menu_template);
            if(element){
            	element.before(widget);
			}
            
            if(element.parent().length === 0){
				widget.css("width", element.outerWidth());
			}else{
				widget.css("width", element.parent().outerWidth());
			}
			if(!!options.height){
				widget.css("height",options.height);
			}
			
		
			if(options.dataSource){
				console.log("bind to Ajax datasource");
				var datasource = options.dataSource;
				datasource.fetch({
                    success: function (data) {
                    	datasource.each(function(model) {
                    		datalist.push(model.attributes);
						});
                    	bind_data();
                    },
                    error:function(){
                    	console.log("Collection fetch error");
                    	
                    },
                });
				//data = options.data_source;
				//bind_data();
				
				//getdata_source json from HTTP
				//setup_data();
			}
            
            //element.css("display", "none");
        } else {
            throw new Error('Cannot apply to non input element');
        }

        return grobject;
		
	};
	
/*****************************************/
	
	$.fn.multiselect = function (options) {
		
        return this.each(function () {
            var $this = $(this);
            if (!$this.data('gonrin')) {
                // create a private copy of the defaults object
                options = $.extend(true, {}, $.fn.multiselect.defaults, options);
                $this.data('gonrin', MultiSelect($this, options));
            }
        });
    };

    $.fn.multiselect.defaults = {
    	textField: null,
        valueField: null,
        /*data_source: The data source of the widget which is used to display a list of values. 
         * Can be a JavaScript object which represents a valid data source configuration, a JavaScript array 
         * or an existing kendo.data.DataSource instance.*/
        dataSource: null,
        height: 200,
    };
}));