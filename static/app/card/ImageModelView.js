define(function (require) {
	"use strict";
	var self = this;
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!./tpl/image-model.html');
	var schema = {
		"_id": {
			"type": "string",
			"primary": true
		},
		"image": {
			"type": "string"
		},
		"bot_id": {
			"type": "string"
		},
		"block_id": {
			"type": "string"
		}
	};

	var imageServiceURL = gonrinApp().imageServiceURL + "?path=chatbot";
	return Gonrin.ModelView.extend({
		modelIdAttribute: "_id",
		template: null,
		modelSchema: schema,
		urlPrefix: "/api/v1/",
		collectionName: "card",
		uiControl: {
			fields: [
				{
					field: "image",
					uicontrol: "imagelink",
					service: {
						url: imageServiceURL,
					}
				},
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
			if (self.model.get("image") !== null && self.model.get("image") !== '') {
				self.$el.find("#image-img").attr("src", self.model.get("image"));
			}
			self.model.on("change:image", function () {
				self.$el.find("#image-img").attr("src", self.model.get("image"));
			});
			self.$el.attr("block-id", self.model.get("_id"));
			self.$el.unbind("click").bind("click", function () {
				self.trigger("block-selected", self.model.get("_id"));
			});

			// view change
			self.model.on("change", function ($event) {
				self.trigger("change", self.model.toJSON());
			});

			//DELETE CARD
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
		},

	});

});