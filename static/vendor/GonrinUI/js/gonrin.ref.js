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
            throw 'Gonrin Ref requires jQuery to be loaded first';
        }
        factory(jQuery);
    }
}(function ($) {
	'use strict';
	function isObjectEqual(a, b) {
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
	}
	var GonrinRef = function (element, options) {
		
		var grexport = {},
		value,
		text,
		data, //datalist
		dataBound = false,
		textElement = false,
		unset = true,
        input,
        menuTemplate = '<ul class="ref-selection-multiple"></ul>',
        itemTemplate =  '<li class="ref-selection-choice"></li>',
        widgetMenuTemplate = '<ul class="dropdown-menu" style="overflow-y:scroll; width: 100%"></ul>',
        widgetItemTemplate =  '<li><a class="ref-wg-data" href="javascript:void(0)"><span class="btn btn-xs btn-danger ref-wg-data-del">X</span></a></li>',
        component = false,
        selectDialog = false,  //dialogView
        widget = false,
        refView,
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
                //'pageUp': 33,
                //33: 'pageUp',
                //'pageDown': 34,
                //34: 'pageDown',
                //'shift': 16,
                //16: 'shift',
                //'control': 17,
                //17: 'control',
                'space': 32,
                32: 'space',
                //'t': 84,
                //84: 't',
                'delete': 46,
                46: 'delete'
        },
        keyState = {},
        
        /********************************************************************************
        *
        * Private functions
        *
        ********************************************************************************/
        isBackBoneDataSource = function(source){
        	var key, _i, _len, _ref;
            _ref = ["dialog"];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              key = _ref[_i];
              if (!source[key]) {
            	  return false;
              }
            }
            return true;
        },
        onSelectChange = function(selectionMode){
        	var selected = selectDialog.uiControl.selectedItems;
        	if(selectionMode == "multiple"){
        		textElement.find("ul").empty();
				var valArray = [];
            	$.each(selected, function(key, item){
            		var txt = item[options.textField];
            		$(itemTemplate).html(txt).appendTo(textElement.find("ul"));
            		
            		if(options.valueField){
            			var val = item[options.valueField];
            			valArray.push(val);
            		}else{
            			valArray.push(item);
            		}
            	});
            	input.val(JSON.stringify(valArray));
            	value = valArray;
            	notifyEvent({
					type:"change.gonrin",
					value : value
				});
        	}else if(selectionMode == "single"){
        		
        		var txt = selected.length > 0 ? selected[0][options.textField]: "";
				textElement.text(txt);
				
				if(options.valueField){
					value = selected.length > 0 ? selected[0][options.valueField]: null;
					var inputtxt = selected.length > 0 ? selected[0][options.valueField]: "";
					input.val(inputtxt);
				}else{
					value = selected.length > 0 ? selected[0]: null;
					input.val(JSON.stringify(value));
				}
				notifyEvent({
					type:"change.gonrin",
					value : value
				});
        	}
        },
        hideWidget = function(){
        	if (widget.is(':hidden')) {
                return grobject;
            }
        	//$(window).off('resize', place);
            widget.off('mousedown', false);
            widget.hide();
            
            /*notifyEvent({
                type: 'hide.gonrin',
                value: value
            });*/
            return grexport;
        },
        showWidget = function(){
        	//clear
        	widget.empty();
        	if((!!selectDialog) && (!!selectDialog.uiControl) && (!!selectDialog.uiControl.selectedItems)
        			&& options.selectionMode === "multiple"){
    			options.selectedItems = selectDialog.uiControl.selectedItems;
    			
				var seleted = selectDialog.uiControl.selectedItems;
				$.each(seleted, function(key, item){
            		var txt = '<span>'+item[options.textField]+'</span>';
            		//$(itemTemplate).html(txt).appendTo(textElement.find("ul"));
            		
            		var $item = $(widgetItemTemplate);
            		$item.find('a.ref-wg-data').prepend(txt);
            		
            		var removeBtn = $item.find(".ref-wg-data-del");
            		removeBtn.unbind("click").bind("click", function(){
            			var itemidx = selectDialog.uiControl.selectedItems.indexOf(item);
            		    if (itemidx > -1) {
            		    	selectDialog.uiControl.selectedItems.splice(itemidx, 1);
            		    }
            			$item.remove();
            			onSelectChange("multiple");
					});
            		
					widget.append($item);
            		
            	});
            	
            	//input.val(JSON.stringify(valArray));
        	};
        	widget.on('mousedown', false);
            widget.show();
        },
        toggleWidget = function () {
            /// <summary>Shows or hides the widget</summary>
            return (widget.is(':hidden') ? showWidget() : hideWidget());
        },
        setupWidget = function(){
        	if (!!options.dataSource) {
        		widget = $(widgetMenuTemplate);
        		if(component){
					component.before(widget);
				}
        		
        		widget.css("width", (options.width !== null) ? options.width : "100%"); 
				widget.css("height", (options.height !== null) ? options.height : "auto"); 
				
				widget.hide();
        	}
        },
        setupDialog = function () {
			//var RefView = options.dataSource
        	if(typeof options.dataSource == "function"){
        		var View = options.dataSource;
        		selectDialog = new View();
        	}else{
        		selectDialog = options.dataSource || null;
        	}
			
			//check is gonrin dialog
			if ((!!selectDialog) && isBackBoneDataSource(selectDialog)) {
				options.textField = options.textField || selectDialog.textField;
				//options.valueField = options.valueField || selectDialog.valueField;
//				selectDialog.uiControl.selectedItems = options.selectedItems || [];
				selectDialog.uiControl.selectedItems = [];
				selectDialog.uiControl.selectionMode = options.selectionMode || "single";
				
				if(!!input.val()){
					try{
						value = $.parseJSON(input.val());
					} catch (error) {
						//console.log(error);
					}
				}
					
				if (options.selectionMode === "single") {
					if (!!value) {
						selectDialog.uiControl.selectedItems = options.selectedItems = [value];
						textElement.text(value[options.textField]);
					}
				}
				if (options.selectionMode === "multiple") {
					setupWidget();
					var ul = textElement.find("ul");
					ul.unbind("click").bind("click", function () {
						toggleWidget();
					});

					if (!!value) {
						selectDialog.uiControl.selectedItems = options.selectedItems = value;
						$.each(value, function (key, item) {
							var txt = item[options.textField];
							$(itemTemplate).html(txt).appendTo(ul);
						});
					}

				}
	            
			};
			return grexport;
		},
		show = function () {
        	if (input.prop('disabled') || (!options.ignoreReadonly && input.prop('readonly')) || (!!options.readonly)) {
                return grexport;
            };
            
            if(selectDialog){
//            	selectDialog.uiControl.selectedItems = options.selectedItems || [];
            	if (!!value){
            		if(options.selectionMode === "single"){
    					selectDialog.uiControl.selectedItems = options.selectedItems = [value];
                	}
                	if(options.selectionMode === "multiple"){
    		        	selectDialog.uiControl.selectedItems = options.selectedItems = value;
                	}
            	}
            	
            	selectDialog.uiControl.filters = options.filters;
            	selectDialog.dialog({size: options.size || "medium"});
            	
            	selectDialog.on("onSelected", function(){
            		if((!!selectDialog) && (!!selectDialog.uiControl) && (!!selectDialog.uiControl.selectedItems)){
            			options.selectedItems = selectDialog.uiControl.selectedItems;
            			
        				if(options.selectionMode === "single"){
        					onSelectChange("single");
        				}
        				if(options.selectionMode === "multiple"){
        					onSelectChange("multiple");
        				}
            		}
            	});
            }
            /*notifyEvent({
                type: 'show.gonui'
            });*/
            return grexport;
        },
        notifyEvent = function (e) {
            //if ((e.type === 'change.gonrin')  && ((e.value && (e.value === e.oldValue)) || (!e.value && !e.oldValue))) {
            //    return;
            //}
            element.trigger(e);
        },
        hide = function(){
            return grexport;
        },
        
        toggle = function () {
            /// <summary>Shows or hides the widget</summary>
            //return (widget.is(':hidden') ? show() : hide());
        	return show();
        },
		subscribeEvents = function () {
        	if(options.onChange){
        		element.bind("change.gonrin", options.context !== null ? $.proxy(options.onChange, options.context ) : options.onChange);
        	}

            /*input.on({
                'change': change,
                'blur': options.debug ? '' : hide,
                'keydown': keydown,
                'keyup': keyup,
                'focus': options.allowInputToggle ? show : ''
            });*/

            /*if (element.is('input')) {
                input.on({
                    'focus': show
                });
            };*/
        	if (textElement) {
        		textElement.on({
                    //'change': change,
                    'blur': hideWidget,
                    //'keydown': keydown,
                    //'focus':  showWidget,
                });
        	}
            if (component) {
                component.on('click', toggle);
                component.on('mousedown', false);
            }
           
        },
        unsubscribeEvents = function () {
            /*input.off({
                'change': change,
                'blur': blur,
                'keydown': keydown,
                'keyup': keyup,
                'focus': options.allowInputToggle ? hide : ''
            });*/

            if (element.is('input')) {
                input.off({
                    'focus': show
                });
            }
            
            if (component) {
                component.off('click', toggle);
                component.off('mousedown', false);
            }
            if(selectDialog){
            	
            }
        },
        getValue = function(){
        	return value;
        },
        setValue = function (val) {
        	if((!!selectDialog) && (!!selectDialog.uiControl)){
				if(options.selectionMode === "single"){
					if (val === null){
						options.selectedItems = selectDialog.uiControl.selectedItems = []
					}else{
						options.selectedItems = selectDialog.uiControl.selectedItems = [val];
					}
					onSelectChange("single");
				}
				if(options.selectionMode === "multiple"){
					if (val === null){
						options.selectedItems = selectDialog.uiControl.selectedItems = []
					}else{
						options.selectedItems = selectDialog.uiControl.selectedItems = val;
					}
					//options.selectedItems = selectDialog.uiControl.selectedItems = val;
					onSelectChange("multiple");
				}
    		};
        },
        clearFilters = function(){
        	options.filters = null;
        	if(selectDialog){
        		var colEl = selectDialog.getCollectionElement();
        		if(colEl){
        			colEl.filter(null);
        		}
        	}
        },
		setFilters = function(filters){
        	options.filters = filters;
        	if(selectDialog){
        		var colEl = selectDialog.getCollectionElement();
        		if(colEl){
        			colEl.filter(options.filters);
        		}
        	}
        },
        getFilters = function(){
        	return options.filters;
        },
        setRefViewData = function(key, value){
        	if(selectDialog){
        		if (!selectDialog.viewData) {
        			selectDialog.viewData = {};
        		}
    			
    			// Sets multiple values
    			if ( typeof key === "object" ) {
    				$.each(key, function(k,val){
    					selectDialog.viewData[k] = val;
    				});
    			}
    			
    			if ( (typeof key === "string") && (value !== undefined )) {
    				selectDialog.viewData[key] = value;
    			}
        	}
		},
        clearValue = function(){
        	value = null;
        	text = null;
        	if(selectDialog){
        		if(selectDialog.selectionMode === "single"){
        			textElement.text("");
        			input.val("");
        		}
        		if(selectDialog.selectionMode === "multiple"){
        			textElement.find("ul").empty();
        			input.val("");
        		}
        	}
        	
        	notifyEvent({
				type:"change.gonrin",
				value : value
			});
        	return;
        };
		
		/********************************************************************************
        *
        * Public API functions
        * =====================
        ********************************************************************************/
		grexport.disable = function () {
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
            return grexport;
        };
        grexport.getValue = getValue;
        grexport.setValue = setValue;
        grexport.clearValue = clearValue;
        grexport.setFilters = setFilters;
        grexport.filters = setFilters;
        grexport.getFilters = getFilters;
        grexport.clearFilters = clearFilters;
        grexport.setRefViewData = setRefViewData;
        
        
		// initializing element and component attributes
        if (element.is('input') ) {
            input = element;
            //value = input.val().length > 0 ? ;
          
            element.wrap( '<span class="input-group"></span>');
            var inputGroupSpan = element.parent();
            //inputGroupSpan.css("width", element.outerWidth());
            var componentButton = $('<span class="input-group-addon dropdown-toggle" data-dropdown="dropdown">').html('<span class="glyphicon glyphicon-th-list"></span><span class="glyphicon glyphicon-remove" style="display:none;"></span>');
            inputGroupSpan.append(componentButton);
            component = componentButton;
            textElement = $('<span class="form-control ref-form-control">');
            if(options.selectionMode === "multiple"){
            	var selectRender = $(menuTemplate).appendTo(textElement);
            	
            }
            element.before(textElement);
            element.css("display", "none");
        } else {
            throw new Error('Cannot apply to non input element');
        }
        
        
    	if (input.is('input'))  {
        	setupDialog();
        	if(!options.placeholder){
        		options.placeholder = input.attr("placeholder");
        	}
        	if(textElement && !!options.placeholder){
        		textElement.attr("placeholder", options.placeholder);
        	}
        	
        };
        
        subscribeEvents();
       
		return grexport;
	};
	
	
	
	
	$.fn.ref = function (options) {
		
        return this.each(function () {
            var $this = $(this);
            if (!$this.data('gonrin')) {
                // create a private copy of the defaults object
                options = $.extend(true, {}, $.fn.ref.defaults, options);
                $this.data('gonrin', GonrinRef($this, options));
            }
        });
    };

    $.fn.ref.defaults = {
    	context: null,
    	//template: null,
    	//height: null,
    	/*placeholder: null,
    	ignore_readonly: false,*/
    	readonly : false,
    	placeholder: null,
    	selectionMode: "single",
    	selectedItems:[],
    	debug: false,
    	filters: false,
    	textField: null,
        valueField: null,
        dataSource: null,
        //value: null,
        onChange : function(){}
    };
}));