define(function (require) {
    "use strict";
    var $                   = require('jquery'),
        _                   = require('underscore'),
        Gonrin				= require('gonrin');
    
    var template 			= require('text!./tpl/value.html'),
    	schema 				= require('json!schema/ContactSchema.json');
    var CustomFilterView    = require('app/common/CustomFilterView');
    
    return Gonrin.CollectionDialogView.extend({
    	template : template,
    	modelSchema	: schema,
    	urlPrefix: "/api/v1/",
    	collectionName: "contact",
    	uiControl:{
    		orderBy:[
				{field: "created_at", direction: "desc"}
			],
    		fields: [
				{field: "name", label: "Block name"}
				],
			onRowClick: function(event) {
				var select = [];
		    	for (var i = 0; i < event.selectedItems.length; i++) {
		    		var obj = {
		    				_id: event.selectedItems[i]._id,
		    				name: event.selectedItems[i].name,
		    		}
		    		select.push(obj);
		    	}
	    		this.uiControl.selectedItems = select;
	    		//this.uiControl.selectedItems = event.selectedItems;
	    	}
    	},
    	tools : [
    		{
    			name: "select",
    			type: "button",
    			buttonClass: "btn-success btn-sm",
    			label: "TRANSLATE:SELECT",
    			command: function() {
    				this.trigger("onSelected");
    				this.close();
    			}
    		}
    	],
    	/**
    	 * 
    	 */
    	render: function() {
    		var self = this;
    		var filter = new CustomFilterView({
    			el: self.$el.find("#filter"),
    			sessionKey: "block_dialog_filter"
    		});
    		filter.render();
    		
    		if(!filter.isEmptyFilter()){
    			var text = !!filter.model.get("text") ? filter.model.get("text").trim() : "";
    			var filters = { "$or": [
					{"name": {"$like": text }}
				] };
    			self.uiControl.filters = filters;
    		}
    		self.applyBindings();
    		
    		filter.on('filterChanged', function(evt) {
    			var $col = self.getCollectionElement();
    			var text = !!evt.data.text ? evt.data.text.trim() : "";
				if ($col) {
					if (text !== null){
						var filters = { "$or": [
							{"name": {"$like": text }}
						] };
						$col.data('gonrin').filter(filters);
						//self.uiControl.filters = filters;
					} else {
						self.uiControl.filters = null;
					}
				}
				self.applyBindings();
    		});
    		return this;
    	}
    });

});