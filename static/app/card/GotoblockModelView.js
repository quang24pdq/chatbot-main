define(function (require) {
	"use strict";
	var self = this;
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!./tpl/goto-block-model.html');
	var BlockSelectView = require("app/block/SelectView");
	var AttributeSelectView = require("app/condition/AttributeSelectView");
	var ValueSelectView = require("app/condition/ValueSelectView");
	var ConditionModelView = require("app/condition/ConditionModelView");

	var schema = {
		"_id": {
			"type": "string",
			"primary": true
		},
		"random": {
			"type": "boolean"
		},
		"blocks": {
			"type": "list"
		},
		"rule_condition": {
			"type": "string"
		},
		"conditions": {
			"type": "list"
		},
		"bot_id": {
			"type": "string"
		},
		"block_id": {
			"type": "string"
		}
	};

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

	return Gonrin.ModelView.extend({
		modelIdAttribute: "_id",
		bindings: "card-gotoblock-bind",
		template: null,
		modelSchema: schema,
		urlPrefix: "/api/v1/",
		collectionName: "card",
		uiControl: {
			fields: [
				{
					field: "blocks",
					uicontrol: "ref",
					textField: "name",
					selectionMode: "multiple",
					dataSource: BlockSelectView
				},
				{
					field: "random",
					uicontrol: "checkbox",
					checkedField: "name",
					valueField: "id",
					dataSource: [
						{ name: true, id: true },
						{ name: false, id: false },
					]
				}
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

			var conditions = self.model.get("conditions");

			if (conditions && Array.isArray(conditions)) {
				var needUpdate = false;
				conditions.forEach((con, index) => {
					if (!con._id) {
						conditions[index]._id = gonrin.uuid();
						needUpdate = true;
					}
					self.renderCondition(con);
				});
				if (needUpdate) {
					self.model.set("conditions", conditions);
				}
			}

			// self.$el.find("#random").unbind("click").bind("click", function($event) {
			// 	console.log("success");
			// 	if (self.$el.find("#random").is(":checked")) {
			// 		self.model.set("random", true );
			// 	} else {
			// 		self.model.set("random", false);
			// 	}
			// });

			self.$el.find("#add_condition").unbind("click").bind("click", function () {
				var conditions = clone(self.model.get("conditions"));
				var data = Gonrin.getDefaultModel(conditionSchema);
				data._id = gonrin.uuid();
				conditions.push(data);
				self.model.set("conditions", conditions);
				self.renderCondition(data);
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
		},

		renderCondition: function (data) {
			var self = this;
			data = clone(data);
			var view = new ConditionModelView();
			view.model.set(data);
			view.render();
			self.$el.find("#condition-container").append(view.$el);
			self.model.trigger("change");
			view.$el.find("button.close").unbind('click').bind('click', { obj: data }, function (e) {
				var fields = self.model.get("conditions");
				var data = e.data.obj;
				for (var i = 0; i < fields.length; i++) {
					if (fields[i].type_filter === data.type_filter && fields[i].value === data.value
						&& fields[i].attribute === data.attribute && fields[i].comparison === data.comparison) {
						fields.splice(i, 1);
					}
				}
				self.model.set("conditions", fields);
				self.model.trigger("change");
				view.destroy();
				view.remove();
			});
			view.on("change", function (data) {
				var conditions = self.model.get("conditions");
				conditions.forEach(function (item, idx) {
					if (item._id === data._id) {
						conditions[idx] = data;
					}
				});
				self.model.set("conditions", conditions);
				self.model.set("rule_condition", "and");

				self.model.trigger("change");
			});
		},
	});

});