define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');
    var template = require('text!./tpl/newline-field.html');
    var schema = require('json!./schema/NewLineFieldSchema.json');
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

            self.$el.find("#" + self.model.get("_id")).unbind('click').bind('click', () => {
            });
        }
    });

});