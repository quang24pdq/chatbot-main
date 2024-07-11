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
	
	var rowSelectEventList = ["rowclick", "rowdblclick", "rowcontextmenu"];
	
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
	var Grid = function (element, options) {
		var gonrin = window.gonrin;
		var grobject = {},
		paginationOptions = {
        	serverPaging: false,
        	page: 1,
        	pageSize: 10,
        	//totalPages: null,
        	//virtualTotalPages:null,
        	totalRows: null,
            pageLinks: 5,
            showGotoPage: false,
            showRowsPerPage: false,
            showRowsInfo: false,
            showRowsDefaultInfo: true,
            //disable_text_selection_in_navpane: true
	    },
		language = {
			columns: "Columns",
		    columns_show_row_numbers: "Row numbers",
		    columns_default: "Default",

		    sorting: "Sorting",
		    sort_ascending: "<i class='glyphicon glyphicon-chevron-up'></i>&nbsp;&nbsp;",
		    sort_descending: "<i class='glyphicon glyphicon-chevron-down'></i>&nbsp;&nbsp;",
		    sort_none: "<i class='glyphicon glyphicon-minus'></i>&nbsp;&nbsp;",
		    sorting_default: "Default",

		    filters: "Filters",
		    filters_apply: "Apply",
		    filters_reset: "Reset",

		    select: "Select",
		    select_all_in_page: "All in page",
		    deselect_all_in_page: "None in page",
		    select_inverse_in_page: "Inverse",
		    deselect_all: "Deselect all",

		    row_index_header: "#",
		    no_records_found: "No records found",
		    
		    error_load_data: "Error loading data",
		    
		    command_delete_label: "Delete",
		    command_edit_label: "Edit",
		    command_cancel_label: "Cancel",
		    
		    validate_error_message: "Error",
		    validate_success_message: "Successfull",
		},
		selectedItems = [],
		data = [], //datalist
		filteredData = [],
		dataSource,
		filterExp, 
		unset = true,
        //menu_template = '<ul class="dropdown-menu" style="overflow-y:scroll"></ul>',
        //item_template =  '<li><a href="javascript:void(0)"></a></li>',
        
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
        * Private API functions
        * =====================
        */
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
        setupWidget = function () {
			
			return grobject;
        },
        attachElementEvents = function () {
        	options.events = options.events || {};
            
            if(!!options.onRowClick){
            	options.events.rowclick = options.onRowClick;
            }
            if(!!options.onRendered){
            	options.events.render = options.onRendered;
            }
            
            if(!!options.onChangePage){
            	options.events.changepage = options.onChangePage;
            }
            
        	//element.unbind("cellclick").bind("cellclick", options.context? $.proxy(options.onCellClick, options.context): options.onCellClick);
            //element.unbind("rowclick").bind("rowclick", options.context? $.proxy(options.onRowClick, options.context): options.onRowClick);
            element.unbind("griderror").bind("griderror", options.context? $.proxy(options.onGridError, options.context): options.onGridError);
            element.unbind("debug").bind("debug", options.context? $.proxy(options.onDebug, options.context): options.onDebug);
            //element.unbind("render").bind("render", options.context? $.proxy(options.onRendered, options.context): options.onRendered);
            element.unbind("rowdeleted").bind("rowdeleted", options.context? $.proxy(options.onRowDeleted, options.context): options.onRowDeleted);
            element.unbind("rowedited").bind("rowedited", options.context? $.proxy(options.onRowEdited, options.context): options.onRowEdited);
            //element.unbind("changepage").bind("changepage", options.context? $.proxy(options.onChangePage, options.context): options.onChangePage);
            
            
            $.each(options.events, function(evtname, handler){
            	element.unbind(evtname).bind(evtname, options.context? $.proxy(handler, options.context): handler);
            });
        },
        detachElementEvents = function () {
        	element.unbind("cellclick");
        	element.unbind("rowclick");
        	element.unbind("griderror");
        	element.unbind("debug");
        	element.unbind("render");
        	element.unbind("rowdeleted");
            element.unbind("rowedited");
            
        	if(!!options.events){
            	$.each(options.events, function(evtname, handler){
            		element.unbind(evtname);
            	});
            }
        },
        notifyEvent = function (e) {
            element.triggerHandler(e);
        },
        arrayMove = function(arr, fromIndex, toIndex) {
            var element = arr[fromIndex];
            arr.splice(fromIndex, 1);
            arr.splice(toIndex, 0, element);
        },
        createId = function(prefix, pluginContainerId) {
            return prefix + pluginContainerId;
        },
        columnIsVisible = function(column) {
            var visible = "visible";
            return !column.hasOwnProperty(visible) || (column.hasOwnProperty(visible) && column[visible] === true);
        },
        findSortable = function(column) {
        	if((!!options.orderByMode)&&(!!options.orderBy)){
        		for (var i = 0; i < options.orderBy.length; i++){
        			if ((column.field === options.orderBy[i]['field'])){
        				return options.orderBy[i];
        			}
        		}
        	}
            return false;
        },
        getorderByMode = function(){
        	
        	return options.orderByMode;
        }, 
        deleteRow = function(el){
        	var $el = $(el);
        	var parent = $el.closest("tr");
        	if(parent){
        		var rowData = parent.data("row_data");
        		for(var i= 0 ; i< data.length; i++)
        		{
        		    if(data[i]["_$row_id"] === rowData["_$row_id"]){
        		    	data.splice(i, 1);
        		    	break;
        		    }
        		}
    			notifyEvent({
                	type:"rowdeleted",
                	//rowId: rowId,
                	rowData:removeDataUUID(rowData)
                });
    			boundData();
        	}
        	
        },
        commandDeleteRow = function(e){
        	e.stopPropagation();
        	var $this = $(this);
        	deleteRow(this);
        },
        
        commandEditRow = function(e){
        	e.stopPropagation();
        	var $this = $(this);
        	var parent = $this.closest("tr");
        	if(parent){
        		var rowData = parent.data("row_data");
        		var rowUuid = rowData['_$row_id']
    			notifyEvent({
                	type:"rowedited",
                	rowUuid: rowUuid,
                	rowData:removeDataUUID(rowData)
                });
        	}
        },
        commandCreateRow = function(e){
        	e.stopPropagation();
        	var $this = $(this);
        	/*var parent = $this.closest("tr");
        	if(parent){
        		var rowData = parent.data("row_data");
        		var rowUuid = rowData['_$row_id']
    			notifyEvent({
                	type:"rowedited",
                	rowUuid: rowUuid,
                	rowData:removeDataUUID(rowData)
                });
        	}*/
        	
        	notifyEvent({
            	type:"rowcreated",
            	rowUuid: null,
            	rowData: null
            });
        },
        
        processRowEvent = function(evtname, rowId, rowStatus, rowData, $el){
        	
        	if((rowSelectEventList.indexOf(evtname) > -1) && options.primaryField && 
	    		(options.selectionMode == "single" || options.selectionMode == "multiple")) {
        		var curRowData = removeDataUUID(rowData);
		    	var idx = selectedRows("selected_index", curRowData);
		    	if(idx > -1) {
		            selectedRows("remove_id", idx);
		            selectedRows("mark_deselected", curRowData);
		            rowStatus = "deselected";
		        } else {
		            if(options.selectionMode == "single") {
		                selectedRows("clear_all_ids");
		                selectedRows("mark_page_deselected");
		            };
		            selectedRows("add_id", curRowData);
		            selectedRows("mark_selected", curRowData);
		            rowStatus = "selected";
		        }
		        selectedRows("update_counter");
		    }
        	//notify
        	notifyEvent({
            	type:evtname,
            	rowId: rowId, 
            	rowStatus: rowStatus, 
            	rowData:curRowData, 
            	selectedItems: removeDataUUID(options.selectedItems),
            	el: $el
            });
        },
        renderData = function(dataToRender){
        	
        	var containerId = element.attr("id"),
	            tableId = createId(options.tableIdPrefix, containerId),
	            elemTable = element.find("#" + tableId),
	            
	            noResultsId = createId(options.noResultsIdPrefix, containerId),
	            elemNoResults = element.find("#" + noResultsId),
	            
	            filterRulesId = createId(options.filterRulesIdPrefix, containerId),
	            
	            paginationId = createId(options.paginationIdPrefix, containerId),
	            elemPagination = element.find("#" + paginationId),
	            errMsg;
        	
        	elemTable.empty();
        	
        	var serverError, filterError, primaryField, totalRows, dataLen, v,
            columns = options.fields,
            colLen = columns.length,
            column, c;
        	
        	totalRows = data.length;
            dataLen = data.length;
            
            primaryField = options.primaryField;
            
            // replace null with empty string
            if(dataToRender > 0) {
                for(v = 0; v < dataLen; v++) {
                    for(c = 0; c < colLen; c++) {
                        column = columns[c];
                        
                        if(columnIsVisible.call(elem,column)) {
                        	
                            if(dataToRender[v][column["field"]] == null) {
                            	dataToRender[v][column["field"]] = '';
                            }
                        }
                    }
                }
            };
            
            var pageNum = parseInt(options.pagination.page),
            	pageSize = parseInt(options.pagination.pageSize),
	            sortingIndicator,
	            rowIdHtml, i, row, tblHtml, rowIndex, colIdHtml,
	            offset = ((pageNum - 1) * pageSize);
	
	        tblHtml = '<thead>';
	        //rowIdHtml = (primaryField ? ' id="' + tableId + '_tr_0"' : '');
	        //tblHtml += '<tr' + rowIdHtml + '>';
	        tblHtml += '<tr class="grid-header" >';
	        
	        tblHtml += '</tr>';
            tblHtml += '</thead>';

            tblHtml += '<tbody class="grid-data">';
            tblHtml += '<tbody>';
            elemTable.html(tblHtml);
	        
            var gridHeader = elemTable.find('thead > tr.grid-header');
            var gridData = elemTable.find('tbody.grid-data');
            
            //add header
	        
	        var foundsort = false;
	        for(i in options.fields) {
                if(columnIsVisible(options.fields[i])) {
                    sortingIndicator = "";
                    var sortableField = findSortable(options.fields[i]);
                    if((!!options.orderByMode) && (sortableField !== false) && (foundsort === false)) {
                    	
                    	var sortingType = sortingType = sortableField.direction || false;
                    	if(sortingType !== false){
                    		switch(sortingType) {
	                            case "asc":
	                            	sortingIndicator = '&nbsp;<span class="' + options.sortingIndicatorAscClass + '"></span>';
	                            	break;
	                            case "desc":
	                            	sortingIndicator = '&nbsp;<span class="' + options.sortingIndicatorDescClass + '"></span>';
	                            	break;
	                            default:
	                            	sortingIndicator = '';
	                        }
                    		foundsort = true;
                    	}
                    }
                    
                    colIdHtml = tableId + '_th_' + options.fields[i].field;
                    var thcol = $("<th>").attr("id",colIdHtml).addClass(options.commonThClass).html((options.fields[i].label || options.fields[i].field) + sortingIndicator);
                    if(options.fields[i].hasOwnProperty("width")){
                    	thcol.css("width", options.fields[i].width)
                    };
                    if(options.fields[i].hasOwnProperty("headerClass")){
                    	thcol.addClass(options.fields[i].hasOwnProperty("headerClass"))
                    };
                    gridHeader.append(thcol);
                }
            }
	        
	        
	        
            for(row in dataToRender) {
            	rowIdHtml = (primaryField ? tableId + '_tr_' + dataToRender[row][primaryField] : '');
            	var trow = $("<tr>").attr("id",rowIdHtml).data("row_data", dataToRender[row] );
            	//class
            	if(!!options.rowClass){
            		if (typeof options.rowClass === "string"){
            			trow.addClass(options.rowClass);
            		}
            		if (typeof options.rowClass === "function"){
            			var classTxt = options.rowClass(dataToRender[row]);
            			trow.addClass(classTxt);
            		}
            	}
            	if(!!dataToRender[row]["_$row_id"]){
            		trow.attr("data-uuid", dataToRender[row]["_$row_id"] );
            	}
            	
                for(i in options.fields) {
                    if(columnIsVisible(options.fields[i])) {
                    	var tcol = $("<td>");
                    	//apply cell template here:
                    	if((!!options.fields[i].template) && (!!gonrin.template)){
                    		if ($.isFunction( options.fields[i].template )){
                    			var tpl = gonrin.template(options.fields[i].template(dataToRender[row]));
    							tcol.html(tpl(dataToRender[row]));
                    		}else{
                    			var tpl = gonrin.template(options.fields[i].template);
    							tcol.html(tpl(dataToRender[row]));
                    		}
							
						}
                    	// Command or Menu Fields
                    	else if((!!options.fields[i].command) || (!!options.fields[i].menu)){
							var commands = options.fields[i].command;
							var menu = options.fields[i].menu;
						
							if($.isArray(commands)){
								$.each(commands, function(iter, command){
									var button = null;
									if (command === "delete"){
								        button = $("<button/>").addClass("btn btn-danger").html(language.command_delete_label);
								        button.bind("click", commandDeleteRow);
									}
									else if (command === "edit"){
								    	button = $("<button/>").addClass("btn btn-warning").html(language.command_edit_label);
								        button.bind("click", commandEditRow);
									}
									if ($.isPlainObject(command)){
										if (!!command.action){
											if (command.action === "delete"){
												button = $("<button/>").attr("type","button").addClass("btn btn-danger").html(command.label || language.command_delete_label);
										        button.bind("click", commandDeleteRow);
											}
											
											if (command.action === "edit"){
												button = $("<button/>").attr("type","button").addClass("btn btn-warning").html(command.label || language.command_edit_label);
										        button.bind("click", commandEditRow);
											}
											if (typeof command.action === "function"){
												button = $("<button/>").attr("type","button").addClass("btn").html(command.label || " ");
												button.bind("click", function(e){
											        e.stopPropagation();
											        var $this = $(this);
										        	var parent = $this.closest("tr");
										        	if(parent){
										        		var rowData = parent.data("row_data");
										        		rowData = removeDataUUID(rowData);
										        		if(options.context){
										        			command.action.call(options.context, {rowData:rowData, el: parent}, command.args||{});
										        		}else{
										        			command.action({rowData:rowData, el: parent},command.args||{});
										        		}
										        	}
												});
											}
											if(!!command.class){
												 if (typeof command.class === "function") {
                                                     button.addClass(command.class({rowData: dataToRender[row]}));
                                                 }
                                                 if (typeof command.class === "string") {
                                                     button.addClass(command.class);
                                                 }
											}
										}
									}
									
									if(button != null){
										tcol.append(button);
									}
								});
							}else if((!!menu) && (!!menu.command) ){
								var btndropdown = $("<button>").addClass("btn").attr({type:"button", "data-toggle":"dropdown", "aria-haspopup": "true", "aria-expanded":"false"});
								btndropdown.html((menu.label || '...') + '<span class="caret"></span>');
								if(!!menu.class){
									btndropdown.addClass(menu.class);
								}
								btndropdown.dropdown();
								var uldropdown = $('<ul>').addClass("dropdown-menu");
								
								if(!!menu.dropdownClass){
									uldropdown.addClass(menu.dropdownClass);
								}
								
								var $menu = $("<div>").addClass("dropdown").append(btndropdown).append(uldropdown);
								
								var menucmds = menu.command;
								if($.isArray(menucmds)){
									$.each(menucmds, function(iter, command){
										var button = null;
										if (typeof command.action === "function"){
											button = $("<li/>").html( '<a href="javascript:void(0)">' + command.label || " "+ '</a>');
											button.bind("click", function(e){
										        e.stopPropagation();
										        var $this = $(this);
									        	var parent = $this.closest("tr");
									        	if(parent){
									        		var rowData = parent.data("row_data");
									        		rowData = removeDataUUID(rowData);
									        		if(options.context){
									        			command.action.call(options.context, {rowData:rowData, el: parent}, command.args||{});
									        		}else{
									        			command.action({rowData:rowData, el: parent},command.args||{});
									        		}
									        	}
											});
										}else if (command.action === "separator"){
											button = $("<li/>").attr("role","separator").addClass("divider");
										}
										if(button){
											uldropdown.append(button);
										}
									})
								}
								
								tcol.append($menu);
								
								tcol.bind("click", function(e){
									e.stopPropagation();
								});
							}
						}else{
							var value = dataToRender[row][options.fields[i].field];
							
							if($.isArray(value)){
								if(options.fields[i].hasOwnProperty("textField")){
									var textVal = "";
									for(var n = 0; n < value.length; n++){
										textVal = textVal + (textVal === ""? "": ", ") + value[n][options.fields[i].textField]
									}
									value = textVal;
								}
							}else if($.isPlainObject(value)){
								if(options.fields[i].hasOwnProperty("textField")){
									value = value[options.fields[i].textField];
								}
							}
							// primary type
							else{
								if (options.fields[i].hasOwnProperty("foreign") && options.fields[i].foreign !== false){
									var foreignObj = dataToRender[row][options.fields[i].foreign];
									var foreignValueField = options.fields[i].foreignValueField;
									var foreignTextField = options.fields[i].foreignTextField;
									if((!!foreignObj) && (!!foreignValueField) && (typeof foreignObj === "object") && (foreignObj[foreignValueField] === value)){
										value = foreignObj[foreignTextField] || "";
									}else{
										value = "";
									}
								}
								if (options.fields[i].hasOwnProperty("foreignValues") && $.isArray(options.fields[i].foreignValues)){
									var foreignValueField = options.fields[i].foreignValueField || "value";
									var foreignTextField = options.fields[i].foreignTextField || "text";
									
									var foreignObj = $.grep(options.fields[i].foreignValues, function(obj){
										return obj[foreignValueField] === value;
									});
									
									if(foreignObj.length == 1){
										foreignObj = foreignObj[0];
									}else{
										foreignObj = null;
									}
									
									value = !!foreignObj? foreignObj[foreignTextField] : "";
								}
								
								//tcol.text(dataToRender[row][options.fields[i].field]);
								
							}
							tcol.text(value);
							
							
						}
                    	
                    	//class
                    	if(options.fields[i].hasOwnProperty("dataClass")){
                    		tcol.addClass(options.fields[i].hasOwnProperty("dataClass"))
                        };
                    	trow.append(tcol);
                    }
                }
                //check row is selected
                
                
                //end check row is selected
                gridData.append(trow);
            }
         // refresh pagination (if needed)
            if((options.pagination !== false) && (options.paginationMode !== false)) {
            	if($.fn.pagination !== undefined){
            		elemPagination.pagination({
            			refresh : true,
                		page: options.pagination.page,
                    	pageSize: options.pagination.pageSize,
                    	totalPages: options.pagination.totalPages,
                    	totalRows: options.pagination.totalRows,
                    	showRowsInfo: options.pagination.showRowsInfo,
                    	virtualTotalPages:null,
                    	onChangePage: function(event){
                    		options.pagination.page = event.page;
                    		if(options.paginationMode === "server"){
                    			boundData();
                    		}else{
                    			renderData(pagingClientData());
                    		}
                    		
                    		notifyEvent({
                            	type:"changepage",
                            	page: event.page
                            });
                    		
                    	}
                    });
            	}
            	
            }
            // no results
            if(totalRows == 0) {
            	elemPagination.hide();
                elemNoResults.show();
            } else {
            	elemPagination.show();
                elemNoResults.hide();
            }
            
         // apply given styles ------------------------------------------
            /*var col_index = options.showRowNumbers ? 1 : 0,
                headerClass = "", dataClass = "";
            for(i in s.columns) {
                if(columnIsVisible(options.fields[i])) {
                    headerClass = "", dataClass = "";
                    if(columns[i].hasOwnProperty("headerClass")) {
                        headerClass = columns[i]["headerClass"];
                    }
                    if(columns[i].hasOwnProperty("dataClass")) {
                        dataClass = columns[i]["dataClass"];
                    }
                    grid.setPageColClass.call(elem, col_index, headerClass, dataClass);
                    col_index++;
                }
            }*/
            
            
         // apply row selections ----------------------------------------
            applyRowSelections();
            
            /**
             * EVENTS ******************************************************
             */

            //TOOLS - columns list -----------------------------------------
            //Edit later
            //var settings = s;
         
         // click on cell -----------------------------------------------
            /*elemTable.off("click", "tbody tr td").on("click", "tbody tr td", function() {
                var col_index = $(this).index();
                var row_index = $(this).parent("tr").index();
                element.triggerHandler("onCellClick", {col: col_index, row: row_index});
            });*/
            
            
            //event processing
            if(!!options.events){
            	$.each(options.events, function(evtname, handler){
            		//row events
            		
            		if(evtname.startsWith("row")){
            			var rowPrefixLen = (tableId + "_tr_").length;
            			var evt = evtname.substring(3, evtname.length);
            			
            			elemTable.off(evt, "tbody tr").on(evt, "tbody tr", function() {
            				var $this = $(this);
                            var rowStatus;
                            var rowData = $this.data("row_data");
                            var rowId;
                            
                            //if(!!options.primaryField){
                            //	rowId = $this.attr(options.primaryField || "id").substr(rowPrefixLen);
                            //}
                            rowId = $this.attr("id").substr(rowPrefixLen);
                            
                            if(((evtname === "rowclick") || (evtname === "rowdblclick")) && (!!options.preventClickOnDblClickEvent)){
                            	if (typeof $this.data("grid_rowClickCount") === 'undefined'){
                            		$this.data("grid_rowClickCount", 0);
                            	}
                            	if(evtname === "rowclick"){
                            		if ($this.data("grid_rowClickCount") == 0){
                            			$this.data("grid_rowClickCount", 1);
                            		}
                                	setTimeout(function() {
                                        if ($this.data("grid_rowClickCount") == 1) {
                                        	$this.data("grid_rowClickCount", 0);
                                        	processRowEvent(evtname, rowId, rowStatus, rowData, $this);
                                        }
                                        if ($this.data("grid_rowClickCount") == 2) {
                                        	$this.data("grid_rowClickCount", 0);
                                        }
                                    }, options.clickTimeout || 200);
                                }
                                if(evtname === "rowdblclick"){
                                	$this.data("grid_rowClickCount", 2);
                                	processRowEvent(evtname, rowId, rowStatus, rowData, $this);
                                }
                            }else{
                            	processRowEvent(evtname, rowId, rowStatus, rowData, $this);
                            }
            			});
            		}
            		
            		//cell event
            		if(evtname.startsWith("cell")){
            			
            		}
            	});
            }
            
            
         // columns sorting --------------------------------------
            elemTable.off("click", "thead th").on("click", "thead th", function() {
            	var rowPrefixLen = (tableId + "_th_").length;
            	var fieldName = $(this).attr("id").substr(rowPrefixLen);

            	if(options.orderByMode !== false){
            		var sortField = findSortable({field:fieldName});
            		
            		if(sortField){
            			if(sortField.direction === "asc"){
                			sortField.direction = "desc";
            			}else{
            				sortField.direction = "asc";
            			}
            			//Update other sortField
            			for(var j = 0; j < options.orderBy.length; j ++){
            				var field = options.orderBy[j];
                    		if(field.field !== fieldName){
                    			field.direction = false;
                    		}
            			}
            			
            			//boundData
            			options.pagination.page = 1;
            			boundData();
            		}
            		
            	}
            });
         // trigger event onDisplay
            notifyEvent({
            	type:"render"
            });
            //element.triggerHandler("render.gonrin");
        },
        applyRowSelections = function(){
        	var containerId = element.attr("id"),
            	tableId = createId(options.tableIdPrefix, containerId);

			if(options.primaryField && options.selectedItems.length > 0) {
            	
                if(options.selectionMode == "single" || options.selectionMode == "multiple") {
                    var rowPrefixLen = (tableId + "_tr_").length,
                        rowId, idx;
                    
                    var curRowData;
                    element.find("#" + tableId + " tbody tr").each(function() {
                    	curRowData = removeDataUUID($(this).data("row_data"));
                        //rowId = parseInt($(this).attr("id").substr(rowPrefixLen));
                        
                        idx = selectedRows("selected_index", curRowData);
                        if(idx > -1) {
                            selectedRows("mark_selected", curRowData);
                        }
                    });
                }
            }

            // update selected rows counter
            selectedRows("update_counter");
        },
        pagingClientData = function(){
			//serverPage
        	if(options.paginationMode  === "client"){
				//options.pagination.page = options.pagination.page || 1;
        		if(filteredData.length == 0){
        			options.pagination.totalPages = 0;
        			options.pagination.page = 1;
        			return filteredData;
        		}
        		options.pagination.totalPages = (filteredData.length % options.pagination.pageSize) == 0 ? filteredData.length / options.pagination.pageSize: parseInt(filteredData.length / options.pagination.pageSize) + 1;
        		if (options.pagination.page > options.pagination.totalPages){
        			options.pagination.page = options.pagination.totalPages;
        		}
        		
        		var pagingData = [];
        		var startIndex = (options.pagination.page - 1) * options.pagination.pageSize;
        		var endIndex = (options.pagination.page - 1) * options.pagination.pageSize + options.pagination.pageSize;
        		if(endIndex > filteredData.length){
        			endIndex = filteredData.length;
        		}
        		
        		for (var i = startIndex; i < endIndex ; i++){
        			pagingData.push(filteredData[i]);
				}
        		return pagingData;
        	}
        	
        	return filteredData;
        },
        sortData = function(){
        	var orderByMode = options.orderByMode, i;
        	var foundsort = false;
        	
        	if(orderByMode === "client"){
        		var sortField = false;
        		for(i in options.fields) {
        			var sortField = findSortable(options.fields[i]);
        			if (sortField){
        				break;
        			}
        		}
        		//var sortField = findSortable(options.fields[i]);
        		var compare = false;
        		var sortingType = false;
        		if(sortField){
        			sortingType = sortField.direction || false;
            		compare = sortField.compare || false;
        		}
        		
        		if((filteredData != null) && (sortField !== false)){
        			var field = sortField.field;
        			switch(sortingType) {
	                    case "asc":
	                    	filteredData.sort(function(a,b){
	                			if(compare !== false){
	                				return compare(a[field], b[field]);
	                			}else{
	                				return a[field] > b[field];
	                			}
	                		});
	                        break;
	                    case "desc":
	                    	filteredData.sort(function(a,b){
	                			if(compare !== false){
	                				return compare(b[field], a[field]);
	                			}else{
	                				return a[field] < b[field];
	                			}
	                		});
	                        break;
	                    default:
	                    	break;
	                }
        		}
        	}
        },
        genDataUUID = function(){
        	if((gonrin) && (!!gonrin.uuid)){
        		for(var i = 0; i < data.length; i ++){
        			data[i]["_$row_id"] = gonrin.uuid();
        		}
        	}
        },
        removeDataUUID = function(dataToRemove){
        	var dataReturn = null;
        	if($.isArray(dataToRemove)){
        		dataReturn = [];
        		$.each(dataToRemove, function(index, obj){
        			if(obj.hasOwnProperty("_$row_id")){
        				delete obj["_$row_id"];
        			}
        			dataReturn.push(obj);
        			
        			
        		});
        		return dataReturn;
        	}else if(typeof dataToRemove === "object"){
        		dataReturn = $.extend({}, dataToRemove);
        		if(dataReturn.hasOwnProperty("_$row_id")){
    				delete dataReturn["_$row_id"];
    			}
    			return dataReturn;
        	}
        	return null;
        },
        isBackBoneDataSource = function(source){
        	var key, _i, _len, _ref;
            _ref = ["fetch"];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              key = _ref[_i];
              if (!source[key]) {
            	  return false;
              }
            }
            return true;
        },
        boundData = function(refresh){
        	dataSource = options["dataSource"];
        	if(typeof dataSource === "object"){
        		if(isBackBoneDataSource(dataSource)){
        			options.paginationMode = options.paginationMode || "server";
        			options.filterMode = options.filterMode || "server";
        			options.orderByMode = options.orderByMode || "server";
        			
        			var collection = dataSource;
        			var pageSize = options.pagination.pageSize;
        			var page = options.pagination.page > 0 ? options.pagination.page : 1;
        			//or filter
        			var query = null;
        			if ((!!options.filters) && (options.filterMode === "server")){
        				query = query || {};
        				query['filters'] = options.filters;
        			}
        			
        			if ((!!options.orderBy) && (options.orderByMode === "server")){
        				query = query || {};
        				query['order_by'] = [];
        				for(var k = 0; k < options.orderBy.length; k++){
        					if(options.orderBy[k].direction){
        						query['order_by'].push({field:options.orderBy[k].field, direction: options.orderBy[k].direction});
        					}
        					
        				}
        			}
        			
        			//order_by
        			//query["order_by"] = {"field": "name", "direction": "asc"}
        			
        			//end filter
        			//var url = collection.url + "?page=" + page + "&results_per_page=" + pageSize + (query? "&q=" + JSON.stringify(query): "");
        			var url = collection.url;
        			if(options.paginationMode === "server"){
        				url = url + "?page=" + page + "&results_per_page=" + pageSize + (query? "&q=" + JSON.stringify(query): "");
        			}else{
        				url = url + (query? "?q=" + JSON.stringify(query): "");
        			}
        			
        			collection.fetch({
        				url: url,
                        success: function (objs) {
                        	//update paging;
                        	options.pagination.page = collection.page;
                        	//options.pagination.pageSize = collection.num_rows;
                        	options.pagination.totalPages = collection.totalPages;
                        	options.pagination.totalRows = collection.numRows;
                        	data.splice(0,data.length);
                        	collection.each(function(model) {
                        		data.push(model.attributes);
							});
                        	
                        	genDataUUID();
							filterData();
							if (options.paginationMode === "client"){
								renderData(pagingClientData());
							}
							else {
								renderData(filteredData);
							}								
                    		
                        },
                        error:function(){
                        	var filter_error;
                            var errMsg = "ERROR: " + language.error_load_data;
                            element.html('<span style="color: red;">' + errMsg + '</span>');
                            
                            notifyEvent({
                            	type:"griderror",
                            	errorCode: "SERVER_ERROR", 
                            	errorDescription: errMsg
                            });
                            
                        },
                    });
        		}else if($.isArray(dataSource)){
        			data = dataSource;
        			genDataUUID();
        			filterData();
        			sortData();
        			renderData(pagingClientData());
        		}
        		
        	}
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
            selectedItems = options.selectedItems || [];
            if(!options.primaryField) {
            	selectedItems = [];
            } else {
                switch(options.selectionMode) {
                    case "single":
                        if(selectedItems.length > 1) {
                        	selectedItems = [];
                        }
                        break;
                    case false:
                    	selectedItems = [];
                        break;
                }
            }
            
            var containerId = element.attr("id");
            element.removeClass().addClass(options.containerClass);
            
            var toolsId = createId(options.toolsIdPrefix, containerId),
            columns_list_id = createId(options.columnsListIdPrefix, containerId),
            default_columns_list = "",
            sorting_list_id = createId(options.sortingListIdPrefix, containerId),
            default_sorting_list = "",
            sorting_radio_name = createId(options.sortingRadioNamePrefix, containerId) + "_",
            startPos, newPos,
            selectedRowsId = createId(options.selectedRowsIdPrefix, containerId),
            selection_list_id = createId(options.selectionListIdPrefix, containerId),
            table_container_id = createId(options.tableContainerIdPrefix, containerId),
            table_id = createId(options.tableIdPrefix, containerId),
            noResultsId = createId(options.noResultsIdPrefix, containerId),
            filter_toggle_id = createId(options.filterToggleIdPrefix, containerId),
            
            pagination_id = createId(options.paginationIdPrefix, containerId),
            filter_container_id = createId(options.filterContainerIdPrefix, containerId),
            filter_rules_id = createId(options.filterRulesIdPrefix, containerId),
            filter_tools_id = createId(options.filterToolsIdPrefix, containerId),
            elemHtml = "";
            
            
         // create basic html structure ---------------------------------
            elemHtml += '<div id="' + toolsId + '" class="' + options.toolsClass + '"></div>';

            elemHtml += '<div id="' + table_container_id + '" class="' + options.datatableContainerClass + '">';
            elemHtml += '<table id="' + table_id + '" class="' + options.datatableClass + '"></table>';
            elemHtml += '</div>';

            elemHtml += '<div id="' + noResultsId + '" class="' + options.noResultsClass + '">' + language.no_records_found + '</div>';

            /*if(options.custom_html_element_id1) {
                elem_html += '<div id="' + custom_html1_id + '"></div>';
            }*/

            elemHtml += '<div id="' + pagination_id + '"></div>';

            /*if(options.custom_html_element_id2) {
                elem_html += '<div id="' + custom_html2_id + '"></div>';
            }*/

            /*if(options.useFilters) {
                elem_html += '<div id="' + filter_container_id + '" class="' + options.filterContainerClass + '">';

                elem_html += '<div id="' + filter_rules_id + '"></div>';

                elem_html += '<div id="' + filter_tools_id + '" class="' + options.filterToolsClass + '">';
                elem_html += '<button class="' + options.filterApplyBtnClass + '">' + language.filters_apply + '</button>';
                elem_html += '<button class="' + options.filterResetBtnClass + '">' + language.filters_reset + '</button>';

                elem_html += '</div>';
            }*/

            elemHtml += '</div>';

            element.html(elemHtml);
            element.find("#" + noResultsId).hide();
            
            var elemTools = element.find("#" + toolsId);
            if(elemTools){
            	elemTools.addClass(options.toolsClass);
            }
            
            var toolsHtml = $("<div>").addClass("btn-group");
            
            if((!!options.tools) && (options.tools.length > 0)){
            	toolsHtml.appendTo(elemTools);
            	for(var i = 0; i < options.tools.length; i ++){
            		var button = $("<button>").addClass("btn btn-sm").attr({"type":"button","name": options.tools[i].name}).html(options.tools[i].label || options.tools[i].name);
            		button.addClass(options.tools[i].buttonClass || "btn-default");
            		if(options.tools[i].command){
            			if($.isFunction(options.tools[i].command)){
            				button.bind("click", options.context? $.proxy(options.tools[i].command, options.context): options.tools[i].command);
            			}else if(typeof options.tools[i].command === "string"){
            				console.log(options.tools[i].command);
            			}
            			
            			
            		}
            		toolsHtml.append(button);
            	}
            }

            /*var elem_tools = element.find("#" + tools_id),
            elemTable = element.find("#" + table_id),
            elem_pagination = element.find("#" + pagination_id);*/
            
            boundData(true);
        },
        selectedRows = function(action, row_data) {
            var containerId = element.attr("id"),
                table_id = createId(options.tableIdPrefix, containerId),
                selectedTrClass = options.selectedTrClass,
                selector_table_tr = "#" + table_id + " tbody tr",
                table_tr_prefix = "#" + table_id + "_tr_";
            
            var id = row_data ? row_data[options.primaryField] : null;
            
            switch(action) {
                case "get_ids":
                	if(options.selectionMode == "single") {
                		return options.selectedItems;
                	};
                	if(options.selectionMode == "multiple") {
                		/*TODO*/
                		return options.selectedItems;
                	};
                    
                    break;
                case "clear_all_ids":
                	options.selectedItems = [];
                    break;
                case "update_counter":
                    var selectedRowsId = createId(options.selectedRowsIdPrefix, containerId);
                    element.find("#" + selectedRowsId).text(options.selectedItems.length);
                    break;
                case "selected_index":
                	for (var idx = 0 ; idx < options.selectedItems.length; idx ++){
                		if ((!!options.primaryField) && (options.primaryField.length > 0)){
                			if(row_data[options.primaryField] === options.selectedItems[idx][options.primaryField])
                				return idx;
                		}
                		else {
                			if (isObjectEqual(row_data, options.selectedItems[idx])){
                				return idx;
                			}
                		}
                	}
                	return -1;
                	//return $.inArray(row_data, options.selectedItems);
                    break;
                case "add_id":
                	options.selectedItems.push(row_data);
                    break;
                case "remove_id":
                	options.selectedItems.splice(row_data, 1);
                    break;
                case "mark_selected":
                	element.find(table_tr_prefix + id).addClass(selectedTrClass);
                    break;
                case "mark_deselected":
                	element.find(table_tr_prefix + id).removeClass(selectedTrClass);
                    break;
                case "mark_page_selected":
                	element.find(selector_table_tr).addClass(selectedTrClass);
                    break;
                case "mark_page_deselected":
                	element.find(selector_table_tr).removeClass(selectedTrClass);
                    break;
                case "mark_page_inversed":
                	element.find(selector_table_tr).toggleClass(selectedTrClass);
                    break;
            }

        },
        filterData = function(query, mode){
			//check Server Filter
			if(!query){
				query = options.filters;
			}
			if (!mode){
				mode =  options.filterMode
			}
        	if((mode === "client") && (query !== null) && (!! gonrin) && (!! gonrin.query)){
        		filteredData = gonrin.query( data, query);
        	}else{
        		filteredData = data
        	}
        },
        setDataSource = function(data){
        	options["dataSource"] = data;
        	boundData();
        };
        
        /********************************************************************************
        *
        * Public API functions
        * =====================
        */
        grobject.getVersion = function() {
            return "0.1.0";
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
        
        grobject.filter = function(query){
        	options.filters = query;
        	options.pagination.page = 1;
        	boundData();
		};
		
		grobject.clientFilter = function(query, mode="client"){
        	//options.filters = query;
			options.pagination.page = 1;
			filterData(query, mode);
			sortData();
        	renderData(pagingClientData());
        };
        
        grobject.changePage = function(page){
        	options.pagination.page = page;
        	boundData();
        };
        
        grobject.deleteRow = deleteRow;
        grobject.boundData = boundData;
        
        grobject.selectedRows = selectedRows;
        
        grobject.getSelectedItems = function(){
        	//return selectedRows("")
        	return removeDataUUID(options.selectedItems);
        };
        
        grobject.setDataSource = setDataSource;
        
        grobject.applyRowSelections = function(){
        	applyRowSelections();
        }
        
        $.extend(true, options, dataToOptions());
        options.pagination = $.extend({}, paginationOptions, options.pagination || {});
        
        language = $.extend({}, language, options.language || {});
        grobject.options(options);
        attachElementEvents();
        initialize();
        
    	setupWidget();
        
        
        //
        if(options.preventClickOnDblClickEvent === null){
        	if(options.events !== null){
        		if((!!options.events.rowclick) && (!!options.events.rowdblclick)){
        			options.preventClickOnDblClickEvent = true;
        		}else{
        			options.preventClickOnDblClickEvent = false;
        		}
        	}
        }
        return grobject;
		
	};
	
/*****************************************/
	
	$.fn.grid = function (options) {
        return this.each(function () {
            var $this = $(this);
            options.refresh = options.refresh || false;
            if ($this.data('gonrin') && options.refresh){
            	$this.data('gonrin', null);
            }
            
            if (!$this.data('gonrin')) {
                // create a private copy of the defaults object
                options = $.extend(true, {}, $.fn.grid.defaults, options);
                $this.data('gonrin', Grid($this, options));
            }
        });
    };

    $.fn.grid.defaults = {
    	refresh: false,
    	context: null,
    	dataSource: null,
        primaryField: "",
        
        selectionMode: "single", // "multiple", "single", false
        selectedItems: [],
        /**
         * MANDATORY PROPERTIES: fields
         * UNIQUE PROPERTIES: fields
         * {field: "customer_id", header: "Code", visible: "no", is_function: "no", "headerClass": "th_code hidden-xs", "dataClass": "td_code hidden-xs"},
         */
        fields: [],
        /**
         * See bs_pagination plugin documentation
         */
        pagination: null,
        
        filters: null,
        orderBy: null,
        tools: null,
        showRowNumbers: false,
        
        // events -- deprecated
        //onCellClick: function() {},
        onRowClick: null,
        onGridError: function() {},
        onDebug: function() {},
        onRendered: function() {},
        onRowDeleted: function(){},
        onRowEdited : function(){},
        
        onValidateError: function(){},
        onValidateSuccess: function(){},
        onChangePage: function(){},
        events:null,
        preventClickOnDblClickEvent:null,
        clickTimeout: 200,
        //end events
        
        orderByMode: "client",
        filterMode: "client",
        paginationMode: "client",
        //
        //manualSelectionEvents: false,
        // bs 3
        containerClass: "grid_container",
        noResultsClass: "alert alert-warning no-records-found",

        toolsClass: "tools tools_grid",

        columnsListLaunchButtonClass: "btn btn-default dropdown-toggle",
        columnsListLaunchButtonIconClass: "glyphicon glyphicon-th",
        columnsListClass: "dropdown-menu dropdown-menu-right",
        columnsListLabelClass: "columns-label",
        columnsListCheckClass: "col-checkbox",
        columnsListDividerClass: "divider",
        columnsListDefaultButtonClass: "btn btn-primary btn-xs btn-block",

        sortingListLaunchButtonIconClass: "glyphicon glyphicon-sort",
        sortingLabelCheckboxClass: "radio-inline",
        sortingNameClass: "sorting-name",

        selectButtonIconClass: "glyphicon  glyphicon-check",
        selectedRowsClass: "selected-rows",

        filterToggleButtonIconClass: "glyphicon glyphicon-filter",
        filterToggleActiveClass: "btn-info",

        sortingIndicatorAscClass: "glyphicon glyphicon-chevron-up text-muted",
        sortingIndicatorDescClass: "glyphicon glyphicon-chevron-down text-muted",

        datatableContainerClass: "table", //"table-responsive"
        datatableClass: "table table-bordered", //table-hover
        commonThClass: "th-common",
        selectedTrClass: "bg-primary",

        filterContainerClass: "well filters-container",
        filterToolsClass: "",
        filterApplyBtnClass: "btn btn-primary btn-sm filters-button",
        filterResetBtnClass: "btn btn-default btn-sm filters-button",

        // prefixes
        toolsIdPrefix: "tools_",
        columnsListIdPrefix: "columns_list_",
        sortingListIdPrefix: "sorting_list_",
        sortingRadioNamePrefix: "sort_radio_",
        selectedRowsIdPrefix: "selectedRows_",
        selectionListIdPrefix: "selection_list_",
        filterToggleIdPrefix: "filter_toggle_",

        tableContainerIdPrefix: "tbl_container_",
        tableIdPrefix: "tbl_",

        noResultsIdPrefix: "no_res_",
        rowClass : "grid_row",

        paginationIdPrefix: "pag_",
        filterContainerIdPrefix: "flt_container_",
        filterRulesIdPrefix: "flt_rules_",
        filterToolsIdPrefix: "flt_tools_",
        // misc
        debugMode: false
    };
}));