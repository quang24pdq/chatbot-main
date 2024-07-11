define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');
    var template = require('text!./tpl/input-field-setting.html');
    var schema = require('json!./schema/InputFieldSchema.json');

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

            self.$el.find("#apply").unbind("click").bind("click", () => {
                self.trigger("apply", self.model.toJSON());
            });
        }
    });

});