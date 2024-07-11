define(function (require) {
	"use strict";
	var self = this;
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!./tpl/jsonapi.html');
//	var BlockSelectView = require("app/Block/SelectView");
//	var AttributeSelectView = require("app/Condition/AttributeSelectView");
//	var ValueSelectView = require("app/Condition/ValueSelectView");
//	var conditionTemplate = require("text!tpl/Condition/model.html");
	var schema = {
		"_id": {
			"type": "string",
			"primary": true
		},
		"report_error": {
			"type": "boolean"
		},
		"type_method": {
			"type": "string"
		},
		"url": {
			"type": "string"
		},
		"attributes": {
			"type": "string"
		},
		"json_plugin_occurred": {
			"type": "string"
		},
		"caption_error_detail": {
			"type": "string"
		},
		"bot_id" : {
			"type": "string"
		},
		"block_id":{
			"type": "string"
		}
	};


	return Gonrin.ModelView.extend({
		modelIdAttribute: "_id",
//		bindings: "card-gotoblock-bind",
		template: null,
		modelSchema: schema,
		urlPrefix: "/api/v1/",
		collectionName: "card",
		uiControl: {
			fields: [
				{
					field: "type_method",
					uicontrol: "combobox",
					textField: "text",
					valueField: "value",
					dataSource: [
						{ "value": "GET", "text": "GET" },
						{ "value": "POST", "text": "POST" },
					],
					value:"GET"
				},
				{
					field: "report_error",
					uicontrol: "checkbox",
					checkedField: "name",
					valueField: "id",
					dataSource: [
						{ name: true, id: true },
						{ name: false, id: false },
					]
				},
				{
                    field: "attributes",
                    uicontrol: "combobox",
                    // textField: "text",
                    // valueField: "value",
                    selectionMode: "multiple",
                 	// dataSource: gonrinApp().data("attributes")
                    dataSource: [
                        // { "value": "first_name", "text": "first_name" },
                        // { "value": "last_name", "text": "last_name" },
                        // { "value": "gender", "text": "gender" },
                    ],
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
			var attributes = this.getApp().data("attributes");
			self.uiControl.fields[2].dataSource = attributes;
			self.applyBindings();

			self.$el.attr("block-id", self.model.get("_id"));
			self.$el.unbind("click").bind("click", function () {
				self.trigger("block-selected", self.model.get("_id"));
			});

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