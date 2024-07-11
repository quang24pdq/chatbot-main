define(function (require) {
	"use strict";
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!./tpl/model.html'),
		schema = require('json!schema/BlockSchema.json');

	return Gonrin.ModelView.extend({
		modelIdAttribute: "_id",
		template: "",
		modelSchema: schema,
		urlPrefix: "/api/v1/",
		collectionName: "block",
		uiControl: {
			fields: [
				{ field: "name" }
			]
		},
		render: function () {
			var self = this;
			var translatedTemplate = gonrin.template(template)(LANG);
			self.$el.empty();
			self.$el.append(translatedTemplate);

			self.applyBindings();

			self.$el.find(".button-block").attr("block-id", self.model.get("_id"));
			self.$el.find(".block-name").html(self.model.get("name")).attr("title", self.model.get("name"));
			if (self.model.get("default") === true) {
				self.$el.find('.button-block').removeClass('col-md-4');
				self.$el.find('.button-block').removeClass('col-xs-6');
				self.$el.find('.button-block').addClass('col-md-12');
				self.$el.find('.button-block').addClass('col-xs-12');
				self.$el.find("span").removeClass("hide");
				self.$el.find('.clone-block-dropdown').remove();
			} else {
				self.$el.find('.button-block').removeClass('col-md-12');
				self.$el.find('.button-block').removeClass('col-xs-12');
				self.$el.find('.button-block').addClass('col-md-4');
				self.$el.find('.button-block').addClass('col-xs-6');
			}

			self.$el.find("#dropdown-block").unbind("click").bind("click", function () {
				self.$el.find("#clone-block").unbind("click").bind("click", function () {
					self.trigger("clone-block", self.model.toJSON());
				});

			});

			self.$el.find("#delete-block").unbind("click").bind("click", function () {
				self.trigger("delete-block", self.model.get("_id"));
			});

			self.$el.find(".block-name").unbind("click").bind("click", function () {
				self.trigger("block-selected", self.model.get("_id"));
			});

			self.model.on("change", function () {
				self.trigger("change", {
					"oldData": self.model.previousAttributes(),
					"data": self.model.toJSON()
				});
			});
			self.getApp().on("block-render", function (block_id) {
				if (block_id === self.model.get("_id")) {
					self.$el.find("button.block-name").addClass("active");
				} else {
					self.$el.find("button.block-name").removeClass("active");
				}
			});
			self.getApp().on("block-broadcast-update-active", function (block_id, status_active) {
				if (block_id === self.model.get("_id")) {
					self.model.set("active", status_active);
					self.model.trigger("change");
				}
			});

			self.getApp().on("block-broadcast-options-update-message-type", function (block_id, message_type) {
				if (block_id === self.model.get("_id")) {
					var broadcast_options = self.model.get("broadcast_options");
					broadcast_options.message_type = message_type;
					self.model.set("broadcast_options", broadcast_options);
					self.model.trigger("change");
				}
			});

			self.getApp().on("block-broadcast-options-update", function (block_id, broadcast_options) {
				if (block_id === self.model.get("_id")) {
					self.model.set("broadcast_options", broadcast_options);
					self.model.trigger("change");
				}
			});

			self.getApp().on("block-broadcast-options-add", function (block_id, broadcast_options_item) {
				if (block_id === self.model.get("_id")) {
					var broadcast_options = self.model.get("broadcast_options");
					delete broadcast_options_item["id"];
					broadcast_options.conditions.push(broadcast_options_item);
					self.model.set("broadcast_options", broadcast_options);
					self.model.trigger("change");
				}
			});

			self.getApp().on("block-broadcast-options-put", function (block_id, condition) {
				if (block_id === self.model.get("_id")) {
					var broadcast_options = self.model.get("broadcast_options");
					var conditions = broadcast_options.conditions;
					conditions.forEach(function (item, idx) {
						delete broadcast_options_item.oldData["id"];
						delete broadcast_options_item.data["id"];
						if (item._id == condition._id) {
							conditions[idx] = condition;
						}
					});
					broadcast_options.conditions = conditions;

					self.model.set("broadcast_options", broadcast_options);
					self.model.trigger("change");
				}
			});

			self.getApp().on("block-broadcast-options-pop", function (block_id, broadcast_options_item) {
				if (block_id === self.model.get("_id")) {
					var broadcast_options = self.model.get("broadcast_options");
					var fields = broadcast_options.conditions;
					var data = broadcast_options_item;
					for (var i = 0; i < fields.length; i++) {
						if (fields[i].type_filter === data.type_filter && fields[i].value === data.value
							&& fields[i].attribute === data.attribute && fields[i].comparison === data.comparison) {
							fields.splice(i, 1);
						}
					}
					broadcast_options.conditions = fields;

					self.model.set("broadcast_options", broadcast_options);
					self.model.trigger("change");
				}
			});
			self.getApp().on("block-broadcast-update-trigger", function (block_id, block_name, trigger_item) {
				if (block_id === self.model.get("_id")) {
					var broadcast_options = self.model.get("broadcast_options");
					broadcast_options.trigger = trigger_item;
					self.model.set("broadcast_options", broadcast_options);
					self.model.trigger("change");
				}
			});
		},
	});

});
