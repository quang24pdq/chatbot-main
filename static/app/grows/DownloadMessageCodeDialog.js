define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');
    var template = require('text!./tpl/download-message-code.html');
    var schema = {
        "ref": {
            "type": "string"
        },
        "image_size": {
            "type": "number"
        }
    };

    return Gonrin.ModelDialogView.extend({
        template: '',
        modelSchema: schema,
        uiControl: {
            fields: [
                {
                    field: "image_size",
                    uicontrol: "combobox",
                    textField: "text",
                    valueField: "value",
                    dataSource: [
                        { text: "60x60", value: 60 },
                        { text: "300x300", value: 300 },
                        { text: "600x600", value: 600 },
                        { text: "1000x1000", value: 1000 },
                        { text: "2000x2000", value: 2000 }
                    ],
                    value: 300
                }
            ]
        },
        render: function () {
            const self = this;
            var translatedTemplate = gonrin.template(template)(LANG);
            self.$el.html(translatedTemplate);
            self.applyBindings();
            self.registerEvent();
        },

        registerEvent: function () {
            const self = this;
            var botId = self.getApp().getRouter().getParam("id");
            self.$el.find("#download-png").unbind("click").bind("click", function () {
                loader.show();
                $.ajax({
                    url: self.getApp().serviceURL + "/api/v1/facebook/get-qr-code",
                    data: JSON.stringify({
                        "bot_id": botId,
                        "image_size": self.model.get("image_size"),
                        "ref": self.model.get("ref")
                    }),
                    type: "POST",
                    success: function (response) {
                        if (response.uri) {
                            loader.hide();
                            console.log("response: ", response);
                            self.trigger("close", response.uri);
                            self.close();
                        } else {
                            loader.error();
                        }
                    },
                    error: function () {
                        loader.error();
                    }
                });
            });

            self.$el.find("#qr-cancel").unbind("click").bind("click", function () {
                self.trigger("close");
                self.close();
            });
        },

    });
});