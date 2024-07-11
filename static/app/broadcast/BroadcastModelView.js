define(function (require) {
	"use strict";
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!./tpl/collection.html'),
		schema = require('json!schema/BroadcastSchema.json');
	var TemplateHelper = require('app/common/TemplateHelper');

	return Gonrin.CollectionView.extend({
		template: null,
		modelSchema: schema,
		urlPrefix: "/api/v1/",
		collectionName: "broadcast",
		uiControl: {
			orderBy: [{ field: "created_at", direction: "desc" }, { field: "last_seen", direction: "desc" }],
			fields: [
				{
					field: "name", label: "{{CONTACT_NAME}}", template: function (rowData) {
						if (rowData.last_name === null || rowData.last_name === undefined) {
							return rowData.name;
						} else {
							return rowData.last_name + ' ' + rowData.first_name;
						}

					}
				},
				{
					field: "locale", label: "{{CONTACT_LOCALE}}", template: function (rowData) {
						var title = rowData.locale;
						if (rowData.locale === 'vi_VI') {
							title = title + "(Việt Nam)";
						} else if (rowData.locale === 'en_US') {
							title = title + "(United State)";
						} else if (rowData.locale === 'en_GB') {
							title = title + "(UNITED KINGDOM)";
						}
						if (rowData.locale) {
							var url_img = static_url + '/images/flag_countries/' + rowData.locale + '.png';
							return '<img title="' + title + '" src="' + url_img + '" style="height:17px; width:20px;"></img>'
						} else {
							return '';
						}
					}
				},
				{
					field: "attributes", label: "{{CONTACT_ATTRS}}", template: function (rowData) {
						var count = Object.keys(rowData).length - 15;
						if (count < 0) {
							count = 0;
						}
						return count + '';
					}
				},
				{
					field: "reachable",
					label: "{{CONTACT_REACHABLE}}",
					width: "118px",
					template: function(rowObject) {
						var reachable = lodash.get(rowObject, 'reachable', false);
						var html = '<div style="width: 100%; text-align: center;">';
						html += reachable ? '<span class="fa fa-check-circle" style="color: #078f07; font-size: 18px;"></span>' : '<span class="fa fa-times-circle" style="font-size: 18px;"></span>';
						html += '</div>';
						return html;
					}
				},
				{ field: "source", label: "{{CONTACT_SOURCE}}" },
				{
					field: "last_seen", label: "{{CONTACT_LAST_SEEN}}", template: function (rowData) {
						var last_seen = rowData.last_seen;
						if (!last_seen || last_seen === null || last_seen === undefined) {
							return '-';
						}

						var template_helper = new TemplateHelper();
						return template_helper.datetimeFormat(last_seen, "DD/MM/YYYY HH:mm");
					}
				},
				{
					field: "created_at", label: "{{CONTACT_SIGNUP}}", template: function (rowData) {
						var value = rowData.created_at;
						if (!value || value === null || value === undefined) {
							return '-';
						}
						var template_helper = new TemplateHelper();
						return template_helper.datetimeFormat(value * 1000, "DD/MM/YYYY HH:mm");
					}
				}
			],
			pagination: {
				page: 1,
				pageSize: 100
			},
			onRowClick: function (event) {
				if (event.rowData._id) {
					var path = this.collectionName + '/model?id=' + event.rowData._id;
					this.getApp().getRouter().navigate(path);
				}
			},
			onRendered: function (e) {
				this.$el.find("#total_people").html(this.collection.numRows + ' ' + LANG.RECORDS + ' / ' + this.collection.totalPages + ' ' + LANG.PAGES);
				var tableHeader = this.$el.find("table .grid-header");
				var translatedHtml = gonrin.template(tableHeader.html())(LANG);
				tableHeader.html(translatedHtml);
			}
		},
		render: function () {
			const self = this;
			var translatedTemplate = gonrin.template(template)(LANG);
            self.$el.html(translatedTemplate);
			var bot_id = this.getApp().getRouter().getParam("id");
			this.applyBindings();
			return this;
		}
	});

});