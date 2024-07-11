define(function (require) {
	"use strict";
	var self = this;
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!./tpl/typing-model.html');
	var schema = {
		"_id": {
			"type": "string",
			"primary": true
		},
		"time": {
			"type": "number",
			"deault": 1.5
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
		template: "",
		modelSchema: schema,
		urlPrefix: "/api/v1/",
		collectionName: "card",
		uiControl: {
			fields: [
			]
		},
		render: function () {
			var self = this;
			var translatedTpl = gonrin.template(template)(LANG);
			self.$el.html(translatedTpl);
			if (this.viewData) {
				var position = lodash.get(this.viewData, 'position', 0);
				self.$el.find("#position").html(position ? position : 0)
			}
			self.applyBindings();
			
			if (!self.model.get("time")) {
				self.model.set("time", 1.5);
				self.model.trigger("change");
			}

			self.$el.find("#rangeValLabel").html(self.model.get("time"));
			self.$el.find("#value_time").on('input', function () {
				var text = $(this).val();
				self.$el.find("#rangeValLabel").html(text);
			});

			self.$el.attr("block-id", self.model.get("_id"));
			self.$el.unbind("click").bind("click", function () {
				self.trigger("block-selected", self.model.get("_id"));
			});

			//view changed
			self.model.on("change", function ($event) {
				self.trigger("change", self.model.toJSON());
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