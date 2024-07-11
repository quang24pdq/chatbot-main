define(function (require) {
	"use strict";
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!../tpl/trigger.html');
	var schema = {
		"type": {
			"type": "string",
			"default": "first_interaction"
		},
		"unit": {
			"type": "string",
			"default": "minutes"
		},
		"value": {
			"type": "string",
			"default": "1"
		}
	};
	return Gonrin.ModelView.extend({
		template: '',
		modelSchema: schema,
		urlPrefix: "/api/v1/",
		collectionName: "block",
		uiControl: {
			fields: [
				{
					field: "type",
					label: "Trigger",
					uicontrol: "combobox",
					textField: "text",
					valueField: "value",
					cssClassField: "cssClass",
					dataSource: [
						{ value: "first_interaction", text: "After First Interaction" },
						{ value: "last_interaction", text: "After Last Interaction" },
						{ value: "after_set_attribute", text: "After User Attribute is Set" },
					],
				},
				{
					field: "unit",
					label: "",
					uicontrol: "combobox",
					textField: "text",
					valueField: "value",
					cssClassField: "cssClass",
					dataSource: [
						{ value: "minutes", text: "Minutes" },
						{ value: "hours", text: "Hours" },
						{ value: "days", text: "Days" },
					],
				},
			]
		},
		render: function () {
			var self = this;
			var translatedTemplate = gonrin.template(template)(LANG);
			self.$el.html(translatedTemplate);
			self.applyBindings();
			self.model.on("change", function () {
				self.trigger("change", {
					"oldData": self.model.previousAttributes(),
					"data": self.model.toJSON()
				});
			});
		}
	});

});