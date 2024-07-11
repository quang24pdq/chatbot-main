define(function (require) {
    "use strict";
    var self = this;
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');

    var template = require('text!./tpl/user-input-model.html');
    var fieldTemplate = require("text!./tpl/field-user-input-model.html");
    var ATTRIBUTES_LABEL = require('json!app/common/attributes.json');

    var schema = {
        "_id": {
            "type": "string",
            "primary": true
        },
        "fields": {
            "type": "list"
        },
        "bot_id": {
            "type": "string"
        },
        "block_id": {
            "type": "string"
        }
    };

    var fieldSchema = {
        "text": {
            "type": "string" // attribute
        },
        "validation": {
            "type": "string" // type of validate
        },
        "attribute": {
            "type": "string" // name of attribute
        },
    };


    var FieldView = Gonrin.ModelView.extend({
        bindings: "field-card-userinput-bind",
        modelSchema: fieldSchema,
        template: "",
        uiControl: {
            fields: [
                {
                    field: "validation",
                    uicontrol: "combobox",
                    textField: "text",
                    valueField: "value",
                    dataSource: [
                        { "value": "phone", "text": "Phone" },
                        // { "value": "number", "text": "Number" },
                        // { "value": "email", "text": "Email" },
                        { "value": "none", "text": "None" },
                    ],
                },
            ]
        },

        render: function () {
            var self = this;
            var translatedTemplate = gonrin.template(fieldTemplate)(LANG);
            self.$el.html(translatedTemplate);
            var id = self.model.get("id");
            if (!id) {
                self.model.set("id", gonrin.uuid())
            }
            self.applyBindings();

            self.model.on("change", function () {
                self.trigger("change", {
                    "oldData": self.model.previousAttributes(),
                    "data": self.model.toJSON()
                });
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


        registerEvents: function () {
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
                    self.renderSuggestions(self.objectAttributes);
                    // self.$el.find("#attribute_suggestion_list").hide();
                }
            });

            self.$el.find("#attribute").unbind("change").bind("change", function (event) {
                var attributes = self.getApp().data("attributes");
                self.model.set("attribute", event.target.value);
                if (event.target.value && !attributes.includes(event.target.value)) {
                    attributes.push(event.target.value);
                    self.getApp().data("attributes", clone(attributes));
                }
            });

            self.$el.find("#attribute").unbind("blur").bind("blur", function ($event) {
                setTimeout(function () {
                    self.$el.find("#attribute_suggestion_list").hide();
                }, 500);
            });
        },

        renderSuggestions: function (attributes) {
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

        getDropdownTemplate: function (item) {
            const self = this;

            var html = `<li><a id="dropdown_item_${item.index}">`;
            html += item.text;
            html += `</a></li>`;

            return html;
        },
    });

    return Gonrin.ModelView.extend({
        modelIdAttribute: "_id",
        bindings: "card-userinput-bind",
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

            var fields = self.model.get("fields");
            var fields_tmp = [];
            fields.forEach(function (item, idx) {
                if (item.text !== null && item.attribute !== null) {
                    fields_tmp.push(item);
                    self.renderField(item);
                }
            });
            self.model.set("fields", fields_tmp);

            // self.$el.find("#random").unbind("click").bind("click", function($event) {
            // 	console.log("success");
            // 	if (self.$el.find("#random").is(":checked")) {
            // 		self.model.set("random", true );
            // 	} else {
            // 		self.model.set("random", false);
            // 	}
            // });

            self.$el.find("#add_field").unbind("click").bind("click", function () {
                var data = Gonrin.getDefaultModel(fieldSchema);
                delete data["id"];
                self.model.get("fields").push(data);
                self.renderField(data);
            });
            // init with a field
            if (!fields || fields.length == 0) {
                self.$el.find("#add_field").trigger("click");
            }

            //change model
            self.model.on("change", function () {
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

        },

        renderField: function (data) {
            var self = this;
            var bot_id = self.model.get("bot_id");
            var view = new FieldView();
            view.model.set(clone(data));
            view.render();
            self.$el.find("#field-container").append(view.$el);
            view.$el.find("button.close").unbind('click').bind('click', { obj: data }, function (e) {
                var fields = self.model.get("fields");
                var data = e.data.obj;
                for (var i = 0; i < fields.length; i++) {
                    if (fields[i].text === data.text && fields[i].validation === data.validation
                        && fields[i].attribute === data.attribute) {
                        fields.splice(i, 1);
                    }
                }
                self.model.set("fields", fields);
                self.model.trigger("change");
                view.destroy();
                view.remove();
            });
            view.on("change", function (event) {
                var fields = self.model.get("fields");
                fields.forEach(function (item, idx) {
                    delete event.oldData["id"];
                    delete event.data["id"];
                    if (_.isEqual(fields[idx], event.oldData)) {
                        fields[idx] = event.data;
                    }

                });
                self.model.set("fields", fields);
                self.model.trigger("change");
            });
        },

    });

});