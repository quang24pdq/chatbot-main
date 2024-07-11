define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');
    var template = require('text!./tpl/ai-rule-import-dialog.html');
    const fileUpload = require("app/common/FileUpload");

    return Gonrin.DialogView.extend({
        template: template,
        modelSchema: {},

        render: function () {
            const self = this;
            self.registerEvent();
        },

        registerEvent: function () {
            const self = this;
            var botId = self.getApp().getRouter().getParam("id");

            this.$el.find("#btn_import_xlsx").unbind("click").bind("click", () => {
                fileUpload({
                    url: self.getApp().serviceURL + "/api/v1/import/ai_rule?bot_id=" + botId
                }, (event) => { }, (event) => {
                    self.trigger("uploaded");
                });
            });
        }
    });
});