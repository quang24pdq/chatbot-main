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
            throw 'gonrin grid requires jQuery to be loaded first';
        }
        factory(jQuery);
    }
}(function ($) {
	'use strict';
	var Pagination = function (element, options) {
		var gonrin = window.gonrin;
		var grobject = {},
		language = {},
		selectedItems = [],
		data = [], //datalist
		filteredData,
		dataSource,
		filterExp, 
		unset = true,
        menu_template = '<ul class="dropdown-menu" style="overflow-y:scroll"></ul>',
        item_template =  '<li><a href="javascript:void(0)"></a></li>',
        
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
        language = {
				go_to_page_title: 'Go to page',
			    rows_per_page_title: 'Rows per page',
			    current_page_label: 'Page',
			    current_page_abbr_label: 'p.',
			    total_pages_label: 'of',
			    total_pages_abbr_label: '/',
			    total_rows_label: 'of',
			    rows_info_records: 'records',
			    go_top_text: '&laquo;',
			    go_prev_text: '&larr;',
			    go_next_text: '&rarr;',
			    go_last_text: '&raquo;'
		},
        
        /********************************************************************************
        *
        * Private API functions
        * =====================
        */
        createId = function(prefix, pluginContainerId) {
            return prefix + pluginContainerId;
        },
        dataToOptions = function () {
            var eData,
                dataOptions = {};

            if (element.is('div') || options.inline) {
                eData = element.data();
            }

            if (eData.dataOptions && eData.dataOptions instanceof Object) {
            	dataOptions = $.extend(true, dataOptions, eData.dataOptions);
            }
            return dataOptions;
        },
        notifyEvent = function (e) {
            element.triggerHandler(e);
        },
        
        initialize = function(){
        	// initializing element and component attributes
            if (element.is('div')) {
            	if(!element.attr("id")){
            		element.attr("id","grid");
    			};
            } else {
                throw new Error('Cannot apply to non input, select element');
            }
            
         // bind events
            element.unbind("changePage").bind("changePage", options.context? $.proxy(options.onChangePage, options.context): options.onChangePage);
            element.unbind("load").bind("load", options.context? $.proxy(options.onLoad, options.context): options.onLoad);
            
         // retrieve options
            var containerId = element.attr("id"),

                nav_list_id = createId(options.navListIdPrefix, containerId),
                nav_top_id = createId(options.navTopIdPrefix, containerId),
                navPrevId = createId(options.navPrevIdPrefix, containerId),
                navItemIdPrefix = createId(options.navItemIdPrefix, containerId) + "_",
                nav_next_id = createId(options.navNextIdPrefix, containerId),
                nav_last_id = createId(options.navLastIdPrefix, containerId),

                goto_page_id = createId(options.navGotoPageIdPrefix, containerId),
                rows_per_page_id = createId(options.navRowsPerPageIdPrefix, containerId),
                rows_info_id = createId(options.navRowsInfoIdPrefix, containerId),

                html = "",
                previousSelection, currentSelection,
                selectorNavTop, selectorNavPrev, selectorNavPages, selectorNavNext, selectorNavLast,
                selector_go_to_page, selector_rows_per_page;
            
            
            html += '<div class="' + options.mainWrapperClass + '">';

            html += '<div class="' + options.navListContainerClass + '">';
            html += '<div class="' + options.navListWrapperClass + '">';
            html += '<ul id="' + nav_list_id + '" class="' + options.navListClass + '">';
            html += '</ul>';
            html += '</div>';
            html += '</div>';
            
            if(options.showGoToPage && options.pageLinks < options.totalPages) {
                html += '<div class="' + options.navGoToPageContainerClass + '">';
                html += '<div class="input-group">';
                html += '<span class="input-group-addon" title="' + language.go_to_page_title + '"><i class="' + options.navGoToPageIconClass + '"></i></span>';
                html += '<input id="' + goto_page_id + '" type="text" class="' + options.navGoToPageClass + '" title="' + language.go_to_page_title + '">';
                html += '</div>';
                html += '</div>';
            }
            if(options.showRowsPerPage) {
                html += '<div class="' + options.navRowsPerPageContainerClass + '">';
                html += '<div class="input-group">';
                html += '<span class="input-group-addon" title="' + language.rows_per_page_title + '"><i class="' + options.navRowsPerPageIconClass + '"></i></span>';
                html += '<input id="' + rows_per_page_id + '" value="' + options.pageSize + '" type="text" class="' + options.navRowsPerPageClass + '" title="' + language.rows_per_page_title + '">';
                html += '</div>';
                html += '</div>';
            }
            if(options.showRowsInfo) {
                html += '<div class="' + options.navInfoContainerClass + '">';
                html += '<div id="' + rows_info_id + '" class="' + options.navInfoClass + '"></div>';
                html += '</div>';
            }
            
            html += '</div>';

            // set nav_pane_html
            element.html(html);
            
            previousSelection = null;
            currentSelection = options.page;
            changePage(containerId, previousSelection, currentSelection, true, false);
            
            //apply style
            element.addClass(options.containerClass);
            
            
            //Events
         // panel events ------------------------------------------------
            if(!options.directURL) {

                // click on go to top
                selectorNavTop = "#" + nav_top_id;
                element.off("click", selectorNavTop).on("click", selectorNavTop, function() {
                    var previousSelection = options.page;
                    options.page = 1;
                    var currentSelection = options.page;
                    changePage(containerId, previousSelection, currentSelection, true, true);
                });
                
                // click on go to prev
                selectorNavPrev = "#" + navPrevId;
                element.off("click", selectorNavPrev).on("click", selectorNavPrev, function() {
                    if(options.page > 1) {
                        var previousSelection = options.page;
                        options.page = parseInt(options.page) - 1;
                        var currentSelection = options.page;
                        var recreateNav = (element.data("nav_start") == previousSelection);
                        changePage(containerId, previousSelection, currentSelection, recreateNav, true);
                    }
                });

                // click on go to next
                selectorNavNext = "#" + nav_next_id;
                element.off("click", selectorNavNext).on("click", selectorNavNext, function() {
                    if((options.page < options.totalPages) || (!options.totalPages)) {
                        var previousSelection = options.page;
                        options.page = parseInt(options.page) + 1;
                        var currentSelection = options.page;
                        var recreateNav = (element.data("nav_end") == previousSelection);
                        changePage(containerId, previousSelection, currentSelection, recreateNav, true);
                    }
                });

                // click on go to last
                selectorNavLast = "#" + nav_last_id;
                element.off("click", selectorNavLast).on("click", selectorNavLast, function() {
                    var previousSelection = options.page;
                    options.page = parseInt(options.totalPages);
                    var currentSelection = options.page;
                    changePage(containerId, previousSelection, currentSelection, true, true);
                });

                // click on nav page item
                selectorNavPages = '[id^="' + navItemIdPrefix + '"]';
                element.off("click", selectorNavPages).on("click", selectorNavPages, function(event) {
                    var previousSelection = options.page;
                    var len = navItemIdPrefix.length;
                    options.page = parseInt($(event.target).attr("id").substr(len));
                    var currentSelection = options.page;
                    changePage(containerId, previousSelection, currentSelection, false, true);
                });
            }
            
        },
        disableSelection = function(ele) {
            return ele
                .attr("unselectable", "on")
                .css("user-select", "none")
                .on("selectstart", false);
        },
        changePage = function(container_id, previousSelection, currentSelection, updateNavItems, triggerChangePage){
        	var navItemIdPrefix = createId(options.navItemIdPrefix, container_id) + "_";
        	
	        if(updateNavItems) {
	            var nav_list = createId(options.navListIdPrefix, container_id),
	                nav_top_id = createId(options.navTopIdPrefix, container_id),
	                nav_prev_id = createId(options.navPrevIdPrefix, container_id),
	                nav_next_id = createId(options.navNextIdPrefix, container_id),
	                nav_last_id = createId(options.navLastIdPrefix, container_id),
	
	                elem_nav_list = element.find("#" + nav_list),
	                nav_html = "",
	                nav_start = parseInt(options.page),
	                nav_end,
	                i, mod, offset, totalSections,
	                nav_url = "",
	                no_url = "javascript:void(0);";
	
	            // navigation pages numbers
	            
	            if(!options.totalPages){
	            	nav_start = options.page;
	            	nav_end = options.page;
	            } else if(options.totalPages < options.pageLinks) {
	                nav_start = 1;
	                nav_end = options.totalPages;
	            } else {
	                totalSections = Math.ceil(options.totalPages / options.pageLinks);
	                if(nav_start > options.pageLinks * (totalSections - 1)) {
	                    nav_start = options.totalPages - options.pageLinks + 1;
	                } else {
	                    mod = nav_start % options.pageLinks;
	                    offset = mod == 0 ? - options.pageLinks + 1 : -mod + 1;
	                    nav_start += offset;
	                }
	                nav_end = nav_start + options.pageLinks - 1;
	            }
	            // store nav_start nav_end
	            element.data("nav_start", nav_start);
	            element.data("nav_end", nav_end);
	            
	            // create nav pages html -----------------------------------------------
	            // show - hide backward nav controls
	            if (!options.totalPages){
	            	nav_url = options.directURL ? options.directURL(nav_start - 1) : no_url;
	                nav_html += '<li><a id="' + nav_prev_id + '" href="' + nav_url + '">' + language.go_prev_text + '</a></li>';
	            }
	            else if(nav_start > 1) {
	                nav_url = options.directURL ? options.directURL(1) : no_url;
	                nav_html += '<li><a id="' + nav_top_id + '" href="' + nav_url + '">' + language.go_top_text + '</a></li>';
	                nav_url = options.directURL ? options.directURL(nav_start - 1) : no_url;
	                nav_html += '<li><a id="' + nav_prev_id + '" href="' + nav_url + '">' + language.go_prev_text + '</a></li>';
	            }
	            
	            // show nav pages
	            
	            for(i = nav_start; i <= nav_end; i++) {
	                nav_url = options.directURL ? options.directURL(i) : no_url;
	                nav_html += '<li><a id="' + navItemIdPrefix + i + '" href="' + nav_url + '">' + i + '</a></li>';
	            }
	            // show - hide forward nav controls
	            if (!options.totalPages){
	            	nav_url = no_url;
	            	nav_html += '<li><a id="' + nav_next_id + '" href="' + nav_url + '">' + language.go_next_text + '</a></li>';
	            }
	            else if(nav_end < options.totalPages) {
	                nav_url = options.directURL ? options.directURL(nav_end + 1) : no_url;
	                nav_html += '<li><a id="' + nav_next_id + '" href="' + nav_url + '">' + language.go_next_text + '</a></li>';
	                nav_url = options.directURL ? options.directURL(options.totalPages) : no_url;
	                nav_html += '<li><a id="' + nav_last_id + '" href="' + nav_url + '">' + language.go_last_text + '</a></li>';
	            }
	            elem_nav_list.html(nav_html);
	
	            if(options.disableTextSelectionInNavPane) {
	                disableSelection(elem_nav_list);
	            }
	
	        }
	
	        // retrieve options
	        var prev_elem = element.find("#" + navItemIdPrefix + previousSelection),
	            current_elem = element.find("#" + navItemIdPrefix + currentSelection);
	
	        // change selected page, applying appropriate styles
	        prev_elem.closest("li").removeClass(options.navListActiveItemClass);
	        current_elem.closest("li").addClass(options.navListActiveItemClass);
	
	
	        // update title
	        var active_title = language.current_page_label + " " + currentSelection + " " + language.total_pages_label + " " + options.totalPages;
	        prev_elem.prop("title", "");
	        current_elem.prop("title", active_title);
	
	        if(options.showRowsInfo && options.showRowsDefaultInfo) {
	            var page_first_row = ((options.page - 1) * options.pageSize) + 1,
	                page_last_row = Math.min(page_first_row + options.pageSize - 1, options.totalRows),
	                info_html = page_first_row + "-" + page_last_row + " " +
	                    language.total_rows_label + " " + options.totalRows + " " + language.rows_info_records +
	                    " (" + language.current_page_abbr_label + options.page + language.total_pages_abbr_label + options.totalPages + ")",
	                rows_info_id = createId(options.navRowsInfoIdPrefix, container_id);
	            element.find("#" + rows_info_id).html(info_html);
	        }
	
	        // trigger event onChangePage (only after some link pressed, not on plugin load)
	        if(triggerChangePage) {
	        	notifyEvent({
	                type:"changePage",
	                page: currentSelection, 
	                pageSize: options.pageSize
	            });
	            //element.triggerHandler("onChangePage", {page: currentSelection, pageSize: options.pageSize});
	        } else {
	        	notifyEvent({
	                type:"load",
	                page: currentSelection, 
	                pageSize: options.pageSize
	            });
	            //element.triggerHandler("onLoad", {page: currentSelection, pageSize: options.pageSize});
	        }
        };
        
        /********************************************************************************
        *
        * Public API functions
        * =====================
        */
        grobject.getVersion = function() {
            return "0.0.1";
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
        
        grobject.getOption= function(opt) {
            return options[opt];
        };
        
        grobject.getAllOptions = function() {
            return options;
        };
        
        $.extend(true, options, dataToOptions());
        grobject.options(options);
        initialize();
    	//setupWidget();
        //attachElementEvents();

        
        return grobject;
		
	};
	
/*****************************************/
	
	$.fn.pagination = function (options) {
        return this.each(function () {
            var $this = $(this);
            options.refresh = options.refresh || false;
            if ($this.data('gonrin') && options.refresh){
            	$this.data('gonrin', null);
            }
            if (!$this.data('gonrin')) {
                // create a private copy of the defaults object
                options = $.extend(true, {}, $.fn.pagination.defaults, options);
                $this.data('gonrin', Pagination($this, options));
            }
        });
    };

    $.fn.pagination.defaults = {
    	refresh: false,
    	context: null,
    	page: 1,
    	pageSize: 10,
    	totalPages: null,
    	totalRows: null,
    	virtualTotalPages:null,
        pageLinks: 5,
        showGotoPage: false,
        showRowsPerPage: false,
        showRowsInfo: false,
        showRowsDefaultInfo: true,
        containerClass: "pagination-container",
        
        directURL: false, // or a function with current page as argument
        disableTextSelectionInNavPane: true, // disable text selection and double click
        
        mainWrapperClass: "row",

        navListContainerClass: "col-xs-12 col-sm-12 col-md-6",
        navListWrapperClass: "",
        navListClass: "pagination pagination_custom",
        navListActiveItemClass: "active",

        navGoToPageContainerClass: "col-xs-6 col-sm-4 col-md-2 row-space",
        navGoToPageIconClass: "glyphicon glyphicon-arrow-right",
        navGoToPageClass: "form-control small-input",

        navRowsPerPageContainerClass: "col-xs-6 col-sm-4 col-md-2 row-space",
        navRowsPerPageIconClass: "glyphicon glyphicon-th-list",
        navRowsPerPageClass: "form-control small-input",

        navInfoContainerClass: "col-xs-12 col-sm-4 col-md-2 row-space",
        navInfoClass: "",

        // element IDs
        navListIdPrefix: "nav_list_",
        navTopIdPrefix: "top_",
        navPrevIdPrefix: "prev_",
        navItemIdPrefix: "nav_item_",
        navNextIdPrefix: "next_",
        navLastIdPrefix: "last_",

        navGotoPageIdPrefix: "goto_page_",
        navRowsPerPageIdPrefix: "rows_per_page_",
        navRowsInfoIdPrefix: "rows_info_",

        onChangePage: function() { // returns page_num and rows_per_page after a link has clicked
        },
        onLoad: function() { // returns page_num and rows_per_page on plugin load
        }
    };
}));