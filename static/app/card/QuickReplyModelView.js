define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');
    var template = require('text!./tpl/quick-reply.html');
    var Helpers = require("app/common/Helpers");
    var ATTRIBUTES_LABEL = require('json!app/common/attributes.json');
    var ButtonView = require('app/card/QuickReplyButtonModelView');

    var schema = {
        "_id": {
            "type": "string",
            "primary": true
        },
        "buttons": {
            "type": "list"
        },
        "text": {
            "type": "string"
        },
        "attribute": {
            "type": "string"
        },
        "process_text_by_ai": {
            "type": "boolean"
        },
        "position": {
            "type": "number",
            "default": 1
        },
        "bot_id": {
            "type": "string"
        },
        "block_id": {
            "type": "string"
        },
        "tenant_id": {
            "type": "string"
        }
    };
    var buttonSchema = {
        "_id": {
            "type": "string"
        },
        "title": {
            "type": "string"
        }
    };

    return Gonrin.ModelView.extend({
        bindings: "card-quickreply-bind",
        template: "",
        modelSchema: schema,
        urlPrefix: "/api/v1/",
        collectionName: "card",

        render: function () {
            var self = this;
            var translateTpl = gonrin.template(template)(LANG);
            self.$el.html(translateTpl);
            if (this.viewData) {
				var position = lodash.get(this.viewData, 'position', 0);
				self.$el.find("#position").html(position ? position : 0)
			}
            self.applyBindings();
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

            self.$el.find("#attribute").unbind("blur").bind("blur", function($event) {
                setTimeout(function() {
                    self.$el.find("#attribute_suggestion_list").hide();
                }, 500);
            });

            //RENDEN BUTTON
            var buttons = self.model.get("buttons");
            if (!!buttons && (buttons.length > 0)) {
                for (var i = 0; i < buttons.length; i++) {
                    self.renderButton(buttons[i]);
                }
            }

            //ADD BUTTON NEW
            self.$el.find("#add_button").unbind("click").bind("click", function () {
                var data = Gonrin.getDefaultModel(buttonSchema);
                data['_id'] = gonrin.uuid()
                data["title"] = self.getApp().translate("NEW_BUTTON");
                self.model.get("buttons").push(data);
                self.model.trigger("change");
                self.renderButton(data);
            });

            //MODEL CHANGED
            self.model.on("change", function ($event) {
                self.trigger("change", self.model.toJSON());
            });

            //DELETE CARD
            self.$el.find("#delete_card").unbind("click").bind("click", function ($event) {
                self.trigger("delete_card", self.model.toJSON());
                self.remove();
            });

            // EVENT CHANGE POSITION
            self.$el.find("#up_card_position").unbind("click").bind("click", function ($event) {
                self.trigger("change_card_position", {
                    "data": self.model.toJSON(),
                    "action": "up"
                });
            });

            // EVENT CHANGE POSITION
            self.$el.find("#down_card_position").unbind("click").bind("click", function ($event) {
                self.trigger("change_card_position", {
                    "data": self.model.toJSON(),
                    "action": "down"
                });
            });
        },

        renderButton: function (data) {
            var self = this;
            var buttonView = new ButtonView();
            buttonView.model.set(clone(data));
            buttonView.render();
            self.$el.find("#buttons-container").append(buttonView.$el);

            buttonView.on("change", function (data) {
                var buttons = self.model.get("buttons");
                buttons.forEach((item, index) => {
                    if (item._id === data._id) {
                        buttons[index] = data;
                    }
                });
                self.model.set("buttons", buttons);
                self.model.trigger("change");
            });

            buttonView.on("delete", function (data) {
                var buttons = self.model.get("buttons");

                buttons.forEach((item, index) => {
                    if (item._id === data._id) {
                        buttons.splice(index, 1);
                    }
                });

                self.model.set("buttons", buttons);
                self.model.trigger("change");
                // buttonView.remove();
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

        validate: function () {
            const self = this;
            if (!self.model.get("attribute") || !Helpers.validateVariable(self.model.get("attribute"))) {
                return false;
            }
            return true;
        }

    });

});
