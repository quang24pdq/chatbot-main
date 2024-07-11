define(function (require) {
	"use strict";
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!./tpl/model.html'),
		schema = require('json!schema/GroupSchema.json');

	return Gonrin.ModelView.extend({
		//modelIdAttribute: "_id",
		bindings: "data-group-bind",
		template: template,
		modelSchema: schema,
		urlPrefix: "/api/v1/",
		collectionName: "group",
		render: function () {
			var self = this;
			self.applyBindings();

			if (this.viewData && this.viewData.trial) {
				self.$el.find(".developing").removeClass('hide');
			}

			var data_group_id = self.model.get("_id");
			self.$el.attr("data-group-id", data_group_id);
			if (self.model.get("type") === "broadcast") {
				self.$el.find(".container-hover").removeClass("container-hover");
				self.$el.find(".group-name-input").hide();
				self.$el.find(".group-name-text").html(self.model.get("name")).show();
				if (self.model.get('broadcast_type') == "sendnow" || self.model.get('broadcast_type') == "subscription") {
					self.$el.find("#create_block").closest('div').removeClass('col-md-4').removeClass('col-xs-6').addClass('col-md-12');
				}
				self.$el.find("#create_block").unbind("click").bind("click", function () {
					self.getApp().trigger("create_block_broadcast", self.model.toJSON());
				});

			} else {
				self.$el.find("#create_block").unbind("click").bind("click", function () {
					self.getApp().trigger("create_block", self.model.get("_id"), self.model.get("type"));
				});
				self.$el.find("#delete_groups").unbind("click").bind("click", function () {
					$.confirm({
						title: LANG.CONFIRM,
						content: LANG.CONFIRM_DELETE,
						buttons: {
							Delete: {
								btnClass: "btn-danger",
								action: function () {
									self.trigger("delete_groups", {
										"data": self.model.toJSON()
									});
									self.remove();
								}
							},
							Cancel: function () {
							}
						}
					});
				});
			}

		},
	});

});
