define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');
    var template = require('text!./tpl/textarea-field.html');
    var schema = require('json!./schema/TextAreaFieldSchema.json');
    var Helper = require('app/common/Helpers');

    var SettingSpaceView = require('app/webview/SettingSpaceView');

    return Gonrin.ModelView.extend({
        template: '',
        modelSchema: schema,
        urlPrefix: "/api/v1/",
        collectionName: "webview",
        render: function () {
            var self = this;
            var translatedTpl = gonrin.template(template)(self.model.toJSON());
            self.$el.html(translatedTpl);
            self.applyBindings();

            self.model.on("change", () => {
                self.trigger("change", self.model.toJSON());
            });

            self.$el.find("#" + self.model.get("_id") + " #field_space").unbind('click').bind('click', () => {

                if (!self.getApp().settingSpace) {
                    self.getApp().settingSpace = new SettingSpaceView({
                        viewData: {
                            childModelData: self.model.toJSON()
                        }
                    });
                    self.getApp().settingSpace.model.set("template", "textarea");
                    self.getApp().settingSpace.render();

                    self.getApp().settingSpace.on('done', (data) => {
                        self.model.set(data);
                        self.$el.find("#" + self.model.get("_id") + " #field_space textarea").css({
                            "color": data.color ? data.color : ''
                        });
                        self.$el.find("#" + self.model.get("_id") + " #field_space textarea").attr({
                            "placeholder": data.placeholder,
                            "class": "form-control " + data.style_class,
                            "rows": data.rows ? data.rows : 2
                        });
                    });
                } else {
                    self.getApp().settingSpace.hide();
                }
            });

            var defaultData = self.model.toJSON();
            self.$el.find("#" + self.model.get("_id") + " #field_space textarea").css({
                "color": defaultData.color
            });
            self.$el.find("#" + self.model.get("_id") + " #field_space textarea").attr({
                "placeholder": defaultData.placeholder,
                "class": "form-control " + defaultData.style_class,
                "rows": defaultData.rows ? defaultData.rows : 2
            });
        }
    });

});