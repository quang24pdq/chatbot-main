define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');
    var template = require('text!./tpl/checkbox-field.html');
    var schema = require('json!./schema/CheckboxFieldSchema.json');

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

            if (!self.model.get("fields") || self.model.get("fields").length == 0) {
                var fields = [
                    {
                        "label": "",
                        "value": "",
                        "checked": false
                    }
                ];
                self.model.set("fields", fields);
            }

            self.renderCheckboxList();
        },

        renderCheckboxList: function () {
            const self = this;
            var fieldContainerEl = self.$el.find("#fields");
            fieldContainerEl.empty();

            var fields = self.model.get("fields");
            fields.forEach((field, index) => {
                var html = `<div class="row" style="padding: 7px 0px;" id="${field._id}">
                    <div class="col-lg-12" style="position: relative;">
                        <div style="position: absolute; left: 15px; top: 0px;">
                            <input type="checkbox" value="${field.value}" style="font-size: 20px; margin: 0px;"/>
                        </div>
                        <div class="" style="margin-left: 20px; min-height: 23px; line-height: 23px;">
                            ${field.label ? field.label : ''}
                        </div>
                    </div>
                </div>`;
                $(html).hide().appendTo(fieldContainerEl).fadeIn();
            });
        }
    });

});