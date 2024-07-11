define(function (require) {
	"use strict";
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!./tpl/select.html'),
		schema = require('json!schema/BlockSchema.json');
	var CustomFilterView = require('app/common/CustomFilterView');

	return Gonrin.CollectionDialogView.extend({
		template: template,
		modelSchema: schema,
		urlPrefix: "/api/v1/",
		collectionName: "block",
		uiControl: {
			orderBy: [
				{ field: "position", direction: "asc" }
			],
			fields: [
				{ field: "name", label: "Block name" }
			],
			onRowClick: function (event) {
				var select = [];
				for (var i = 0; i < event.selectedItems.length; i++) {
					var obj = {
						_id: event.selectedItems[i]._id,
						name: event.selectedItems[i].name,
					}
					select.push(obj);
				}
				this.uiControl.selectedItems = select;
			},
			refresh: true
		},
		tools: [
			{
				name: "select",
				type: "button",
				buttonClass: "btn-success btn-sm",
				label: "TRANSLATE:SELECT",
				command: function () {
					this.trigger("onSelected");
					this.close();
				}
			}
		],
    	/**
    	 *
    	 */
		render: function () {
			var self = this;
			var filter = new CustomFilterView({
				el: self.$el.find("#filter"),
				sessionKey: "block_dialog_filter"
			});
			filter.render();
			var array_filters = [{ "bot_id": { "$eq": gonrinApp().data("bot_id") } },{"$or":[{ "type": { "$eq": "structure" } },{ "type": { "$eq": "Structure" } }]}];

			if (!filter.isEmptyFilter()) {
				var text = !!filter.model.get("text") ? filter.model.get("text").trim() : "";
				var check_filter = {
					"$or": [
						{ "name": { "$like": text } }
					]
				};
				array_filters.push(check_filter);
//				self.uiControl.filters = filters;
			}
			self.uiControl.filters ={ "$and": array_filters};
//			var filters = { "$and": [{ "bot_id": { "$eq": gonrinApp().data("bot_id") } },{ "type": { "$eq": "structure" } }] };

			self.applyBindings();
			filter.on('filterChanged', function (evt) {
				var $col = self.getCollectionElement();
				var text = !!evt.data.text ? evt.data.text.trim() : "";
				if ($col) {
					if (text !== null) {

						var filters = {
							"$or": [
								{ "name": { "$regex": '/'+text+'/i' } }
//								{ "name": { "$like": text } }
							]
						};
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
