define(function (require) {
	"use strict";
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!./tpl/collection.html'),
		schema = require('json!schema/BroadcastSchema.json');
	var Helper = require('app/common/Helpers');

	return Gonrin.CollectionView.extend({
		template: null,
		modelSchema: schema,
		urlPrefix: "/api/v1/",
		collectionName: "broadcast",
		uiControl: {
			orderBy: [{ field: "sent_time", direction: "desc" }],
			fields: [
                {
                    field: 'sent_time',
					label: "Sent Time",
					template: function(rowObject) {
						return rowObject.sent_time ? Helper.formatTimestampToDatetime(rowObject.sent_time) : '';
					}
                },
				{
					field: "name", label: "Broadcast Name"
				}
			],
			pagination: {
				page: 1,
				pageSize: 15
			},
			onRowClick: function (event) {
				if (event.rowData._id) {
					this.trigger('view', event.rowData._id);
				}
			},
			onRendered: function (e) {
				var tableHeader = this.$el.find("table .grid-header");
				var translatedHtml = gonrin.template(tableHeader.html())(LANG);
				tableHeader.html(translatedHtml);
			},
			selectedTrClass: 'bg-info'
		},
		render: function () {
			const self = this;
			var translatedTemplate = gonrin.template(template)(LANG);
            self.$el.html(translatedTemplate);
            var bot_id = this.getApp().getRouter().getParam("id");
            this.uiControl.filters = {
                'bot_id': bot_id,
                'type': 'subscription'
            };
            this.applyBindings();
            
            self.$el.find("#create").unbind("click").bind("click", (event) => {
                self.trigger('create');
            });
			return this;
		}
	});

});