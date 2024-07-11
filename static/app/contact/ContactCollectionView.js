define(function (require) {
	"use strict";
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!./tpl/collection.html'),
		schema = require('json!schema/ContactSchema.json');
	var TemplateHelper = require('app/common/TemplateHelper');
	var Helper = require('app/common/Helpers');

	return Gonrin.CollectionView.extend({
		template: null,
		modelSchema: schema,
		urlPrefix: "/api/v1/",
		collectionName: "contact",
		datatableClass: "table table-padded",
		uiControl: {
			orderBy: [{ field: "last_sent", direction: "desc" }, { field: "created_at", direction: "desc" }],
			fields: [
				{
					field: "locale", label: " ", width: "37px", template: function (rowData) {
						var title = rowData.locale;
						if (rowData.locale && rowData.locale === 'vi_VN') {
							title = title + "(Việt Nam)";
						} else if (rowData.locale && rowData.locale === 'en_US') {
							title = title + "(United State)";
						} else if (rowData.locale && rowData.locale === 'en_GB') {
							title = title + "(UNITED KINGDOM)";
						}
						if (rowData.locale) {
							var url_img = static_url + '/images/flag_countries/' + rowData.locale + '.png';
							return '<img title="' + title + '" src="' + url_img + '" style="height:17px; width:20px;"></img>';
						} else {
							var url_img = static_url + '/images/flag_countries/unknown.png';
							return '<img title="" src="' + url_img + '" style="height:17px; width:20px;"></img>';
						}
					}
				},
				{
					field: "name", label: "{{CONTACT_NAME}}", template: function (rowData) {
						var html = '<div style="position: relative;">';
						html += `<div style="height: 35px; width: 35px; position: absolute;
											 top: 1px; border-radius: 99px; overflow: hidden;
											 background-image: url(${rowData.profile_pic}); background-size: cover; background-position: center;">
								 </div>`;
						html += `<div style="margin-left: 42px;">
							${rowData.name ? rowData.name : ''}
							<p style="margin: 0px; font-size: 12px; color: #2a81f1;">${rowData.id}</p>
							</div></div>`
						return html;
					}
				},
				{
					field: "gender",
					label: "{{CONTACT_GENDER}}",
					width: "85px",
					template: function (rowObject) {
						var html = `<div style="width: 100%; text-align: center;">`;
						html += (rowObject.gender ? rowObject.gender : '');
						html += "</div>";
						return html;
					}
				},
				{
					field: "attributes", label: "{{CONTACT_ATTRS}}", template: function (rowData) {
						// var count = Object.keys(rowData).length - 15;
						// if (count < 0) {
						// 	count = 0;
						// }
						// return count + '';
						var html = rowData.phone ? rowData.phone : '';

						if (html) {
							html += ',...';
						}
						return html;
					}
				},
				{
					field: "reachable",
					label: "{{CONTACT_REACHABLE}}",
					width: "82px",
					template: function (rowObject) {
						var reachable = lodash.get(rowObject, 'reachable', false);
						var html = '<div style="width: 100%; text-align: center;">';
						if (reachable == true) {
							html += '<span class="fa fa-check-circle" style="color: #078f07; font-size: 18px;"></span>'
						} else {
							html += '<span class="fa fa-times-circle" style="font-size: 18px;"></span>'
						}
						html += '</div>';
						return html;
					}
				},
				{
					field: "source",
					label: "{{CONTACT_SOURCE}}"
				},
				{
					field: "last_sent", label: "{{CONTACT_LAST_SENT}}", width: "142px", template: function (rowObject) {
						var last_sent = lodash.get(rowObject, 'last_sent', '');
						if (!last_sent) {
							return '';
						}
						// return Helper.formatTimestampToDatetime(last_sent, { format: "DD/MM/YYYY HH:mm" });
						return Helper.utcToLocal(last_sent);
					}
				},
				{
					field: "created_at", label: "{{CONTACT_SIGNUP}}", width: "130px", template: function (rowObject) {
						var created_at = lodash.get(rowObject, 'created_at', '');
						if (!created_at) {
							return '';
						}
						return Helper.utcToLocal(created_at);
					}
				}
			],
			pagination: {
				page: 1,
				pageSize: 50
			},
			onRowClick: function (event) {
				if (event.rowData._id) {
					var path = this.collectionName + '/model?id=' + event.rowData._id;
					this.getApp().getRouter().navigate(path);
				}
			},
			onRendered: function (e) {
				spinner.hide();
				this.$el.find("#total_people").html(this.collection.numRows + ' ' + LANG.RECORDS + ' / ' + this.collection.totalPages + ' ' + LANG.PAGES);
				var tableHeader = this.$el.find("table .grid-header");
				var translatedHtml = gonrin.template(tableHeader.html() ? tableHeader.html() : '')(LANG);
				tableHeader.html(translatedHtml);
				this.loadReachable();
				this.loadInteractedContact();
			},
			onChangePage: function (event) {
				setTimeout(() => {
					var tableHeader = this.$el.find("table .grid-header");
					var translatedHtml = gonrin.template(tableHeader.html() ? tableHeader.html() : '')(LANG);
					tableHeader.html(translatedHtml);
					this.loadReachable();
				}, 400);
			},
			selectedTrClass: 'bg-transparent'
		},
		initialize: function() {
			spinner.show();
		},
		render: function () {
			const self = this;
			var translatedTemplate = gonrin.template(template)(LANG);
			self.$el.html(translatedTemplate);
			var bot_id = this.getApp().getRouter().getParam("id");
			this.uiControl.filters = {
				"bot_id": { "$eq": bot_id },
				"$or": [
					{
						"interacted": true
					},
					{
						"reachable": true
					}
				]
			};
			if (self.getApp().page_id) {
				this.uiControl.filters['page_id'] = {'$eq': self.getApp().page_id};
			}
			var html_header_contact = `<div class="row" style="margin-top:40px;">
				<div class="col-lg-9 col-md-8 col-sm-8 col-xs-12">
					<label id="total_people"></label>
					<label id="reachable" style="background-color: #0095ff; color: #fff; padding: 0px 8px;border-radius: 2px;margin: 0px 5px;" title=""></label>
					<label id="interaction" style="background-color: #ff9900; color: #fff; padding: 0px 8px;border-radius: 2px;margin: 0px 5px;" title="{{CONTACT_INTERACTION_TITLE}}"></label>
				</div>
				<div class="col-lg-3 col-md-4 col-sm-4 col-xs-12">
					<input type="text" class="form-control d-none" placeholder="${LANG.SEARCH}" id="contact_search" />
				</div>
			</div>`;
			this.$el.find("div[block-bind='toolbar']").html(html_header_contact);
			self.applyBindings();
			return this;
		},

		loadReachable: function () {
			const self = this;
			var bot_id = this.getApp().getRouter().getParam("id");
			loader.show();
			$.ajax({
				url: self.getApp().serviceURL + '/api/v1/contact/reachable/total?bot_id=' + bot_id,
				type: 'GET',
				success: function (response) {
					loader.hide();
					self.$el.find("#reachable").html(response.reachables + ' ' + LANG.CONTACT_REACHABLES);
				},
				error: function (xhr) {
					loader.error('lỗi hệ thống, thử lại sau');
				}
			})

		},

		loadInteractedContact: function () {
			const self = this;
			var bot_id = this.getApp().getRouter().getParam("id");
			loader.show();
			$.ajax({
				url: self.getApp().serviceURL + '/api/v1/contact/interaction/total?bot_id=' + bot_id,
				type: 'GET',
				success: function (response) {
					loader.hide();
					self.$el.find("#interaction").html(response.interaction + ' ' + LANG.CONTACT_INTERACTIONS);
				},
				error: function (xhr) {
					loader.error('lỗi hệ thống, thử lại sau');
				}
			})

		}
	});

});