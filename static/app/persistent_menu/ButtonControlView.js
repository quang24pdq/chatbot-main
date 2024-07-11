define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');
    var template = require('text!./tpl/button.html'),
        buttonSchema = require('json!schema/ButtonSchema.json');
    var BlockSelectView = require("app/block/SelectView");

    return Gonrin.ModelView.extend({
        bindings: "button-card-text-bind",
        modelSchema: buttonSchema,
        template: null,
        changed: false,
        uiControl: {
            fields: [
                {
                    field: "blocks",
                    uicontrol: "ref",
                    textField: "name",
                    selectionMode: "multiple",
                    dataSource: BlockSelectView
                },
            ]
        },
        render: function () {
            var self = this;
            var templateObject = clone(LANG);
            templateObject._id = self.model.get("_id");
            var translatedTemplate = gonrin.template(template)(templateObject);
            self.$el.html(translatedTemplate);
            self.applyBindings();

            this.model.on("change", function() {
                self.changed = true;
            });

            self.$el.find("#btn-" + self.model.get("_id")).unbind("click").bind("click", function(event) {
                self.changed = false;
                var configEl = $(this).find("#card-button-configure");
                // HIDE ALL OTHER DROPDOWNS
                $('.dropdown').each(function(index, element) {
                    if ($(this).attr("id") != ("btn-" + self.model.get("_id"))) {
                        $(element).find('#card-button-configure').hide();
                    }
                });
                
                if (configEl.is(':hidden')) {
                    configEl.show();
                    configEl.find("button.card-button-configure-close-button").unbind("click").bind("click", function (event) {
                        if (self.$el.find("#btn-" + self.model.get("_id")).find(".card-button-configure-title").val().length > 20) {
                            return;
                        }
                        event.stopPropagation();
                        if (self.changed) {
                            self.trigger("change", self.model.toJSON());
                        }
                        configEl.hide();
                    });

                    configEl.find("button.card-button-configure-delete-button").unbind("click").bind("click", function (event) {
                        event.stopPropagation();
                        self.trigger("delete", self.model.toJSON());
                        configEl.hide();
                    });
                }

                $(".overlay").addClass("active");
                $(".overlay").unbind("click").bind("click", function(event) {
                    $(".overlay").removeClass("active");
                    configEl.find("button.card-button-configure-close-button").unbind("click");
                    configEl.hide()
                });
            });

            self.$el.find("#btn-" + self.model.get("_id")).find(".card-button-configure-title").unbind("change").bind("change", function(event) {
                    self.model.set("title", event.target.value)
            });

            self.$el.find("#btn-" + self.model.get("_id")).find(".btn-block").unbind("click").bind("click", function (event) {
                event.stopPropagation();
                self.trigger("card-button-detail-click", "blocks");
            });
            self.$el.find("#btn-" + self.model.get("_id")).find(".btn-url").unbind("click").bind("click", function (event) {
                event.stopPropagation();
                self.trigger("card-button-detail-click", "url");

            });

            self.on("card-button-detail-click", function (type) {
                console.log("card-button-detail-click ", type);
                if (type == "blocks") {
                    self.$el.find("#tab-block").show();
                    self.$el.find("#tab-url").hide();
                    self.$el.find("#tab-phone").hide();

                    self.$el.find(".btn-block").removeClass("btn-sm");
                    self.$el.find(".btn-url").addClass("btn-sm");
                    self.$el.find(".btn-phone").addClass("btn-sm");

                    self.model.set("url", null);
                    self.model.set("webview_height_ratio", null);
                    self.model.set("phone_number", null);
                    self.model.set("type", "postback");

                } else if (type == "url") {
                    self.$el.find("#tab-block").hide();
                    self.$el.find("#tab-url").show();
                    self.$el.find("#tab-phone").hide();

                    self.$el.find(".btn-block").addClass("btn-sm");
                    self.$el.find(".btn-url").removeClass("btn-sm");
                    self.$el.find(".btn-phone").addClass("btn-sm");

                    self.model.set("blocks", []);
                    self.model.set("webview_height_ratio", "full");
                    self.model.set("phone_number", null);
                    self.model.set("type", "web_url");
                }
            });

            //first init

            if ((self.model.get("url") || null) !== null) {
                self.trigger("card-button-detail-click", "url");
                self.$el.find(".btn-url").removeClass("btn-sm");
            } else if ((self.model.get("phone_number") || null) !== null) {
                self.trigger("card-button-detail-click", "phone");
                self.$el.find(".btn-phone").removeClass("btn-sm");
            } else {
                self.trigger("card-button-detail-click", "blocks");
                self.$el.find(".btn-block").removeClass("btn-sm");
            }

        },
        //        toogle: function (button_id) {
        //            var self = this;
        //            if (self.model.get("id") === button_id) {
        //                self.$el.find("#card-button-configure").show();
        //            } else {
        //                self.$el.find("#card-button-configure").hide();
        //            }
        //
        //        }
    });
});
