define(function (require) {
	"use strict";
	var self = this;
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');
	var conditionTemplate = require("text!./tpl/model.html");
	var ATTRIBUTES_LABEL = require('json!app/common/attributes.json');
	var conditionSchema = {
		"_id": {
			"type": "string"
		},
		"type_filter": {
			"type": "string" // attribute
		},
		"value": {
			"type": "string" // value of attribute
		},
		"attribute": {
			"type": "string" // name of attribute
		},
		"comparison": {
			"type": "string" // == != > <s
		}
	};

	var OPERATOR_VALUES = [
		{
			'text': 'Not set',
			'value': 'not_set'
		},
		{
			'text': 'True',
			'value': true
		},
		{
			'text': 'False',
			'value': false
		}
	];

	return Gonrin.ModelView.extend({
		bindings: "condition-card-gotoblock-bind",
		modelSchema: conditionSchema,
		template: conditionTemplate,
		uiControl: {
			fields: [
				{
					field: "type_filter",
					uicontrol: "combobox",
					textField: "text",
					valueField: "value",
					dataSource: [
						{ "value": "attribute", "text": "attribute" },
					],
				},
				{
					field: "attribute",
					uicontrol: "combobox",
					// dataSource: gonrinApp().data("attributes")
					dataSource: []
				},
				{
					field: "comparison",
					uicontrol: "combobox",
					textField: "text",
					valueField: "value",
					dataSource: [
						{ "value": "==", "text": "is" },
						{ "value": "!=", "text": "not" },
						{ "value": ">", "text": ">" },
						{ "value": "<", "text": "<" },
					],
				}
			]
		},

		render: function() {
			var self = this;
			var botId = this.getApp().getRouter().getParam("id");
			var url = self.getApp().serviceURL + "/api/v1/bot/" + botId;

			var attributes = this.getApp().data("attributes");
			self.uiControl.fields[1].dataSource = attributes;
			var element = self.$el.find(".container-hover div");
			var attrs = element[1];
			var timer = setInterval(function () {
				var displayStatus = "none";
				$(attrs).find(".combobox-control").unbind("click").bind("click", function (event) {
					var attributes = self.getApp().data("attributes");
					console.log("attributes ", attributes);
					self.uiControl.fields[1].dataSource = attributes;
					// if (displayStatus == "none") {
					// 	$.ajax({
					// 		url: url,
					// 		data: null,
					// 		type: "GET",
					// 		success: function(response) {
					// 			var newAttrs = clone(response.user_define_attribute);
					// 			var attrs = self.getApp().data("attributes");
					// 			if (newAttrs && attrs && newAttrs.length > attrs.length) {
					// 				self.getApp().data("attributes", newAttrs);
					// 				self.uiControl.fields[1].dataSource = newAttrs;
					// 				self.applyBindings("attributes");
					// 			}
					// 		}
					// 	});
					// }
					// displayStatus = $(this).find("ul").css("display");
				});
				clearInterval(timer);
			}, 200);

			self.applyBindings();
			self.model.on("change", function () {
				self.trigger("change", self.model.toJSON());
			});

			self.$el.find(".close").unbind("click").bind("click", () => {
				self.trigger("delete", self.model.get("_id"));
			});

			var flag = false;
            if (this.model.get("attribute")) {
                self.getApp().data("attributes").forEach((item) => {
                    if (self.model.get("attribute") == item) {
                        self.$el.find("#attribute").val(ATTRIBUTES_LABEL[item] ? ATTRIBUTES_LABEL[item] : item);
                        flag = true;
                    }
                });
            }
            if (!flag) {
                self.$el.find("#attribute").val(self.model.get("attribute"));
			}
			
			self.registerEvents();
		},

		registerEvents: function() {
			const self = this;
			self.$el.find("#attribute").unbind("click").bind("click", ($event) => {
				var attributes = self.getApp().data("attributes");
				var objectAttributes = [];
				attributes.forEach((item, index) => {
					var clonedItem = {
						'index': index,
						'text': ATTRIBUTES_LABEL[item] ? ATTRIBUTES_LABEL[item] : item,
						'value': item
					};
					objectAttributes.push(clonedItem);
				});
				self.objectAttributes = objectAttributes;

				var text = self.$el.find("#attribute").val() ? self.$el.find("#attribute").val().trim() : "";
				if (text && text.length >= 1) {
					var filteredAttributes = self.objectAttributes.filter(item => (item.value ? item.value.toLocaleLowerCase().includes(text.toLocaleLowerCase()) : false)
						|| (item.text ? item.text.toLocaleLowerCase().includes(text.toLocaleLowerCase()) : false));
					self.renderSuggestions(filteredAttributes);
				} else {
					self.renderSuggestions(objectAttributes);
				}
			});

			self.$el.find("#attribute").unbind("keyup").bind("keyup", function (event) {
				var text = event.target.value ? event.target.value.trim() : "";
				if (text && text.length >= 1) {
					var filteredAttributes = self.objectAttributes.filter(item => (item.value ? item.value.toLocaleLowerCase().includes(text.toLocaleLowerCase()) : false)
						|| (item.text ? item.text.toLocaleLowerCase().includes(text.toLocaleLowerCase()) : false));
					self.renderSuggestions(filteredAttributes);
				} else {
					self.$el.find("#attribute_suggestion_list").hide();
				}
			});

			self.$el.find("#attribute").unbind("blur").bind("blur", function($event) {
                setTimeout(function() {
                    self.$el.find("#attribute_suggestion_list").hide();
                }, 500);
            });
		},

		renderSuggestions: function(attributes) {
			const self = this;
			var suggestionEl = this.$el.find("#attribute_suggestion_list");
			suggestionEl.empty();
			attributes.forEach((item, index) => {
				suggestionEl.append(self.getDropdownTemplate(item));
				self.$el.find("#dropdown_item_" + item.index).unbind("click").bind("click", ($event) => {
					self.$el.find("#attribute").val(item.text);
					self.model.set("attribute", item.value);
					suggestionEl.hide();
				});
			});
			suggestionEl.show();
		},

		getDropdownTemplate: function(item) {
			const self = this;
			var html = `<li><a id="dropdown_item_${item.index}">`;
			html += item.text;
			html += `</a></li>`;

			return html;
		},
	});
});