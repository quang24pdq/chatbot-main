define(function (require) {
	"use strict";
	var self = this;
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!./tpl/email-model.html');
	var schema = {
		"_id": {
			"type": "string",
			"primary": true
		},
		"email": {
			"type": "string"
		},
		"title": {
			"type": "string"
		},
		"email_body": {
			"type": "string"
		},
		"bot_id": {
			"type": "string"
		},
		"block_id": {
			"type": "string"
		}
	};


	return Gonrin.ModelView.extend({
		modelIdAttribute: "_id",
		template: null,
		modelSchema: schema,
		urlPrefix: "/api/v1/",
		collectionName: "card",
		uiControl: {
			fields: [
			]
		},
		render: function () {
			var self = this;
			var translatedTemplate = gonrin.template(template)(LANG);
			self.$el.html(translatedTemplate);
			if (this.viewData) {
				var position = lodash.get(this.viewData, 'position', 0);
				self.$el.find("#position").html(position ? position : 0)
			}
			self.applyBindings();

			self.$el.attr("block-id", self.model.get("_id"));
			self.$el.unbind("click").bind("click", function () {
				self.trigger("block-selected", self.model.get("_id"));
			});

			//delete
			self.$el.find("#delete_card").unbind("click").bind("click", function ($event) {
				self.trigger("delete_card", self.model.toJSON());
				self.remove();
			});

			self.$el.find("#up_card_position").unbind("click").bind("click", function ($event) {
				self.trigger("change_card_position", {
					"data": self.model.toJSON(),
					"action": "up"
				});
			});

			self.$el.find("#down_card_position").unbind("click").bind("click", function ($event) {
				self.trigger("change_card_position", {
					"data": self.model.toJSON(),
					"action": "down"
				});
			});
		}

	});

});