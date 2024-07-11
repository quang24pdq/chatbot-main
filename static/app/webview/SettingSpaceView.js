define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');
    var template = require('text!./tpl/setting-space.html');
    var schema = {
        '_id': {
            "type": "string"
        },
        "template": {
            "type": "string"
        }
    };

    var TextFieldSettingView = require("app/webview/TextFieldSettingView");
    var InputFieldSettingView = require("app/webview/InputFieldSettingView");
    var TextAreaFieldSettingView = require("app/webview/TextAreaFieldSettingView");

    var FieldSettingMap = {
        'text': TextFieldSettingView,
        'input': InputFieldSettingView,
        'textarea': TextAreaFieldSettingView
    }

    return Gonrin.ModelView.extend({
        template: template,
        modelSchema: schema,
        previousTemplate: null,
        urlPrefix: "/api/v1/",
        collectionName: "webview",  
        render: function () {
            var self = this;
            self.applyBindings();
            $("#webview_space").html(self.el);

            $("#webview_space").addClass("show");

            if (self.model.get('template') && FieldSettingMap[self.model.get('template')]) {
                var view = new FieldSettingMap[self.model.get('template')]();
                if (self.viewData.childModelData) {
                    view.model.set(self.viewData.childModelData);
                }
                view.render();
                $(view.el).hide().appendTo(self.$el.find("#container")).fadeIn();

                view.on("apply", (data) => {
                    self.trigger("done", data);
                    self.hide();
                });
            } 
        },

        hide: function() {
            const self = this;
            self.trigger("close");
            $("#webview_space").removeClass("show");
            self.getApp().settingSpace = null;
        }
    });

});