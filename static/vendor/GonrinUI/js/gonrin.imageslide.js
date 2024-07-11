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
            throw 'gonrin imageslide requires jQuery to be loaded first';
        }
        factory(jQuery);
    }
}(function ($) {
	'use strict';
	var ImageSlide = function (element, options) {
		var gonrin = window.gonrin;
		var grobject = {},
		elementId = null,
		
		setupWidget = function(){
			element.empty();
			element.addClass("carousel slide").attr("data-ride","carousel");
			
			var indicator = $("<ol>").addClass("carousel-indicators");
			var innerItems = $("<div>").addClass("carousel-inner").attr("role","listbox");
			element.append(indicator);
			element.append(innerItems);
			for(var i = 0; i < options.dataSource.length; i++){
				 var itemObj = options.dataSource[i];
				 var indicatorEl = $("<li>").attr({"data-target": "#"+elementId, "data-slide-to": "" + i});
				 
				 indicator.append(indicatorEl);
				 var itemHtml = '<div class="carousel-img" data-img-src="' + itemObj[options.imageKey] +'"></div>';
				 itemHtml += '<div class="carousel-caption"></div>';
				 var itemEl = $("<div>").addClass("item").html(itemHtml);
				 innerItems.append(itemEl);
				 //caption:
				 var caption = options.caption;
				 //console.log(caption);
				 if(!!caption){
					 var captionEl = itemEl.find(".carousel-caption");
					 if((!!caption.text) && (!!gonrin.template)){
						 var tpl = gonrin.template(caption.text);
						 var captionTextEl = $("<div>").attr("itemId", i).html(tpl(itemObj));
						 captionEl.append(captionTextEl);
					 }
				 }
				 
				 
				 
				 if (i == 0){
					 indicatorEl.addClass("active");
					 itemEl.addClass("active");
				 }
				 
			}
			
			//async load image
			var imgs = element.find(".carousel-img");
			
    		if (imgs.length > 0) {
    			imgs.each(function (index, imgel) {
    				var img = $("<img>");
    				img.attr("src", $(imgel).attr("data-img-src")).addClass("pop-in");
    				img.css({
    					width: (!!options.width ? options.width: "auto"),
    					height: (!!options.height ? options.height: "auto")
    				});
    	            $(imgel).append(img);
    	        });
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
        
        /*if (element.is('input') ) {
            element.addClass("form-control");
        } else {
            throw new Error('Cannot apply to non input, select element');
        }*/
        if(!element.attr("id")){
        	element.attr("id", "carousel-slide");
        }
        elementId = element.attr("id");
        if((!!options.dataSource)&&($.isArray(options.dataSource))){
        	options.dataSource;
        	setupWidget();
        }

        return grobject;
	};
	
/*****************************************/
	
	$.fn.imageslide = function (options) {
        return this.each(function () {
            var $this = $(this);
            if (!$this.data('gonrin')) {
                // create a private copy of the defaults object
                options = $.extend(true, {}, $.fn.imageslide.defaults, options);
                $this.data('gonrin', ImageSlide($this, options));
            }
        });
    };
    $.fn.imageslide.defaults = {
    	context: null,
		dataSource: null,
		caption: null,
		imageKey: "url",
		width: null,
		height: null
    };
}));