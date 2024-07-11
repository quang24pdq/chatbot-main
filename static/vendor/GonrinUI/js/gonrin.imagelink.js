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
            throw 'gonrin imagelink requires jQuery to be loaded first';
        }
        factory(jQuery);
    }
}(function ($) {
	'use strict';
	var ImageLink = function (element, options) {
		
		var gonrin = window.gonrin;
		var grobject = {},
		xhr = function () {
            return new XMLHttpRequest();
        },
		value,
		text,
		data, //datalist
		index = -1,
		text_element = false,
		unset = true,
        input,
        menu_template = '<input type="file" accept="file_extension|audio/*|video/*|image/*|media_type" id="fileUpload"/>',
        
        component = false,
        widget = false,
        data_source_type,
		keyMap = {
                'up': 38,
                38: 'up',
                'down': 40,
                40: 'down',
                'left': 37,
                37: 'left',
                'right': 39,
                39: 'right',
                'tab': 9,
                9: 'tab',
                'escape': 27,
                27: 'escape',
                'enter': 13,
                13: 'enter',
                'pageup': 33,
                33: 'pageup',
                'pagedown': 34,
                34: 'pagedown',
                'shift': 16,
                16: 'shift',
                'control': 17,
                17: 'control',
                'space': 32,
                32: 'space',
                //'t': 84,
                //84: 't',
                'delete': 46,
                46: 'delete'
        },
        keyState = {},
        _lastkey,
        _prev,
        _typing_timeout,
        /********************************************************************************
         *
         * Private functions
         *
         ********************************************************************************/
        
        setup_widget = function () {
        	
        	widget = $(menu_template);
        	if(component){
				component.prepend(widget);
			}
        	widget.css("width", 0);
        	widget.css("height", 0);
			return grobject;
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
        
        toggle = function () {
            /// <summary>Shows or hides the widget</summary>
            alert("show");
        },
        
        upload = function (file) {
            if(!!options.service){
            	var service = options.service;
            	var xhttp    = xhr(),
                fd       = new FormData(),
                url = service.url;
            	
//            	file_extension|audio/*|video/*|image/*|media_type
            	if (file.type.match(/image.*/)) {
            		fd.append('image', file);
                }
            	if (file.type.match(/video.*/)) {
            		fd.append('video', file);
                }
            	if (file.type.match(/audio.*/)) {
            		fd.append('audio', file);
                }
//            	if (file.type.match(/media_type/)) {
//            		fd.append('media_type', file);
//                }
//            	if (file.type.match(/file_extension/)) {
//            		fd.append('file_extension', file);
//                }
	            
	            xhttp.open('POST', url);
	            if(!!service.headers){
	            	$.each(service.headers, function(key, prop){
	            		xhttp.setRequestHeader(key, prop); //Get yout Client ID here: http://api.imgur.com/  
	            	});
	            }
	            xhttp.onreadystatechange = function () {
	                if (xhttp.status === 200 && xhttp.readyState === 4) {
	                	var imgobj;
	                	if(!!service.parse){
	                		imgobj = service.parse(xhttp.responseText);
	                	}else{
	                		imgobj = JSON.parse(xhttp.responseText);
	                	}
	                	
	                    //var res = JSON.parse(xhttp.responseText), link, p, t;
	                    //self.remove(status);
	                    //link = res.data.link;
	                    //p    = self.create('p');
	                    //t    = document.createTextNode('Image uploaded!');
	                    element.val(imgobj.link);
	                    notifyEvent({
		                    type: 'change.gonrin',
		                    value: imgobj,
		                });
	                }
	            };
	            xhttp.send(fd);
            }
        },
        
        subscribeEvents = function () {
            if (component) {
            	var browserBtn  = component.find('button');
            	var fileUpl  = component.find('#fileUpload')[0];
            	browserBtn.bind("click", function(){
            		$(fileUpl).trigger("click");
            	})
            	fileUpl.addEventListener('change', function (e) {
                    var files = e.target.files, file, p, t, i, len;
                    for (i = 0, len = files.length; i < len; i += 1) {
                        file = files[i];
//                        || file.type.match(/media_type/) || file.type.match(/file_extension/)
                        if (file.type.match(/image.*/) || file.type.match(/video.*/) || file.type.match(/audio.*/)) {
                            upload(file);
                        } else {
                        	alert('The data type is incorrect');
                        }
                    }
                }, false);
            }
        },
        
        notifyEvent = function (e) {
            if ((e.type === 'change.gonrin')  && ((e.value && (e.value === e.oldValue)) || (!e.value && !e.oldValue))) {
                return;
            }
            element.trigger(e);
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
            value = input.val();
            element.wrap( '<span class="input-group"></span>');
            var inputGroupSpan = element.parent();
            var componentButton = $('<span class="input-group-btn">').html('<button class="btn btn-default" type="button">Browse...</button>');
            inputGroupSpan.append(componentButton);
            component = componentButton;
            element.addClass("form-control");
            
        } else {
            throw new Error('Cannot apply to non input element');
        }

        $.extend(true, options, dataToOptions());
        
        grobject.options(options);
        
    	setup_widget();
    	
    	if(!options.placeholder){
    		options.placeholder = input.attr("placeholder");
    	}
    	
        subscribeEvents();
        
        return grobject;
		
	};
	
/*****************************************/
	
	$.fn.imagelink = function (options) {
		
        return this.each(function () {
            var $this = $(this);
            if (!$this.data('gonrin')) {
                // create a private copy of the defaults object
                options = $.extend(true, {}, $.fn.imagelink.defaults, options);
                $this.data('gonrin', ImageLink($this, options));
            }
        });
    };

    $.fn.imagelink.defaults = {
        /*The value of the widget.*/
        value: null,
        service: null,
        context: null,
    };
}));
