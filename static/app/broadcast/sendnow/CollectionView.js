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
			orderBy: [{ field: "created_at", direction: "desc" }],
			fields: [
				{
					field: 'sent_time',
					label: "Sent Time",
					template: function (rowObject) {
						return `<div style="line-height: 28px;">${rowObject.sent_time ? Helper.formatTimestampToDatetime(rowObject.sent_time) : ''}</div>`;
					}
				},
				{
					field: "name",
					label: "Broadcast Name",
					template: function (rowObject) {
						return `<div class="detail" style="width: 100%; line-height: 28px;">
							<a id="${rowObject._id}" href="javascript:void(0);">${rowObject.name ? rowObject.name : ''}</a>
						</div>`
					}
				},
				{
					field: "recipients",
					label: "Recipients",
					template: function (rowObject) {
						return `<div style="line-height: 28px;">${rowObject.recipients ? rowObject.recipients : 'N/A'}</div>`;
					}
				},
				{
					field: "succeeded",
					label: "Succeeded",
					template: function (rowObject) {
						if (rowObject.succeeded) {
							return `<div style="line-height: 28px;">${rowObject.succeeded} (${Math.ceil(rowObject.succeeded / rowObject.recipients * 1000) / 10 + '%'})</div>`;
						} else {
							if (rowObject.recipients && rowObject.failed != null) {
								return `<div style="line-height: 28px;">${rowObject.recipients - rowObject.failed} (${Math.ceil((rowObject.recipients - rowObject.failed) / rowObject.recipients * 1000) / 10 + '%'})</div>`;
							}
							return `<div style="line-height: 28px;">N/A</div>`;
						}
					}
				},
				{
					field: "read",
					label: "Read",
					template: function (rowObject) {
						return `<div style="line-height: 28px;">${rowObject.read ? rowObject.read : 'N/A'}</div>`;
					}
				},
				{
					field: "replied",
					label: "Replied",
					template: function (rowObject) {
						return `<div style="line-height: 28px;">${rowObject.replied ? rowObject.replied : 'N/A'}</div>`;
					}
				},
				{
					field: "_id", label: " ", width: '44px', template: function (rowObject) {
						return `<div class="refresh" style="width: 100%;">
							<button id="${rowObject._id}" class="btn btn-default" style="padding: 3px 7px;color: #337ab7;">
								<span class="glyphicon glyphicon-refresh"></span></button>
							</div>`;
					}
				}
			],
			pagination: {
				page: 1,
				pageSize: 15
			},
			onRowClick: function (event) {
				return;
			},
			onRendered: function (e) {
				var tableHeader = this.$el.find("table .grid-header");
				var translatedHtml = gonrin.template(tableHeader.html())(LANG);
				tableHeader.html(translatedHtml);
				this.registerEvents();
			},
			selectedTrClass: 'bg-info',
			refresh: true
		},
		render: function () {
			const self = this;
			var translatedTemplate = gonrin.template(template)(LANG);
			self.$el.html(translatedTemplate);
			var bot_id = this.getApp().getRouter().getParam("id");
			this.uiControl.filters = {
				'bot_id': bot_id,
				'type': 'sendnow'
			};
			this.applyBindings();

			self.$el.find("#create").unbind("click").bind("click", (event) => {
				self.trigger('create');
			});
			return this;
		},

		registerEvents: function () {
			const self = this;
			var bot_id = this.getApp().getRouter().getParam("id");
			var data = this.uiControl.dataSource.toJSON();

			if (data && Array.isArray(data)) {
				data.forEach((item, index) => {
					self.$el.find(".refresh #" + item._id).unbind("click").bind("click", () => {
						$.ajax({
							url: self.getApp().serviceURL + '/api/v1/broadcast/check-result?id=' + item._id + '&bot_id=' + bot_id,
							type: 'GET',
							success: function (response) {
								self.applyBindings();
							},
							error: function (xhr) {

							}
						})
					});

					self.$el.find(".detail #" + item._id).unbind("click").bind("click", () => {
						this.trigger('view', item._id);
					});
				});
			}
		}
	});

});