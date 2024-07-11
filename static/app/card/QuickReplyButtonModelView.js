define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');
    var buttonTemplate = require("text!./tpl/quick-reply-button-model.html");

    var buttonSchema = {
        "_id": {
            "type": "string"
        },
        "title": {
            "type": "string"
        }
    };


    return Gonrin.ModelView.extend({
        bindings: "button-card-quickreply-bind",
        modelSchema: buttonSchema,
        template: "",
        uiControl: {
        },

        render: function () {
            var self = this;
            var translateTpl = gonrin.template(buttonTemplate)(LANG);
            self.$el.html(translateTpl);
            var _id = self.model.get("_id");
            if (!_id) {
                self.model.set("_id", gonrin.uuid())
            }

            self.$el.find(".card-quickreply-button-title").attr("id", _id);

            self.applyBindings();
            self.$el.find(".card-quickreply-button-title button").unbind("click").bind("click", function (e) {
                self.getApp().trigger("card-quickreply-button-click", _id);
            });

            self.getApp().on("card-quickreply-button-click", function (button_id) {
                if (self.model.get("_id") === button_id) {
                    var configEl = self.$el.find("#" + button_id).find("#card-quickreply-button-configure");
                    if (configEl.is(':hidden')) {
                        configEl.show();
                    }
                    self.$el.find("#" + _id).find("#card-quickreply-button-configure-close-button").unbind("click").bind("click", function (event) {
                        configEl.css({ 'display': 'none' });
                        self.trigger("change", self.model.toJSON());
                    });
                } else {
                    self.$el.find("#card-quickreply-button-configure").hide();
                }
            });

            //delete button
            self.$el.find("#card-quickreply-delete-button").unbind("click").bind("click", function (event) {
                self.trigger("delete", self.model.toJSON());
                self.destroy();
            });
        },
    });
});
