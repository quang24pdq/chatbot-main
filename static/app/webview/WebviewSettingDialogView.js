define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');

    var template = require('text!./tpl/webview-setting-dialog.html'),
        schema = require('json!schema/WebviewSchema.json');
    var Helper = require('app/common/Helpers');

    var TextField = require('app/webview/TextFieldView');
    var InputField = require('app/webview/InputFieldView');
    var TextAreaField = require('app/webview/TextAreaFieldView');
    var CheckboxField = require('app/webview/CheckboxFieldView');
    var NewLineField = require('app/webview/NewLineField');

    var uiControlMap = {
        "text": TextField,
        "input": InputField,
        "textarea": TextAreaField,
        "checkbox": CheckboxField,
        "select": "",
        "radio": "",
        "media": "",
        "countdown": "",
        "newline": NewLineField
    }

    return Gonrin.ModelDialogView.extend({
        template: '',
        modelSchema: schema,
        urlPrefix: "/api/v1/",
        collectionName: "webview",
        uiControl: {
            fields: [
                {
                    field: "webview_height_ratio",
                    uicontrol: "combobox",
                    textField: "text",
                    valueField: "value",
                    dataSource: [
                        { text: '100%', value: 'full' },
                        { text: '75%', value: 'tall' },
                        { text: '50%', value: 'compact' }
                    ]
                }
            ]
        },
        render: function () {
            var self = this;
            self.$el.empty();
            var translatedTemplate = gonrin.template(template)(LANG);
            self.$el.html(translatedTemplate);
            self.applyBindings();

            setTimeout(() => {
                $(".modal-body").append(`<div class="webview-setting-container" id="webview_space"></div>`);
            }, 200);

            self.loadDefaultData();
            self.registerEvents();
        },

        loadDefaultData: function () {
            const self = this;

            var previewEl = self.$el.find("#webview_preview");
            previewEl.empty();
            var fields = lodash.get(self.model.toJSON(), 'fields', []);
            fields.forEach((field, index) => {
                var uiControlName = field.name;

                if (uiControlMap[uiControlName]) {
                    var view = new uiControlMap[uiControlName]();
                    view.model.set(clone(field));
                    view.render();
                    $(view.el).hide().appendTo(previewEl).fadeIn();

                    view.on("change", (data) => {
                        console.log("CHANGED: ", data);
                        var fields = self.model.get("fields");
                        fields.forEach((field, index) => {
                            if (field._id == data._id) {
                                fields[index] = clone(data);
                            }
                        });
                        self.model.set("fields", fields);
                    });
                }
            });
        },

        registerEvents: function () {
            const self = this;

            self.$el.find("#close").unbind("click").bind("click", () => {
                self.close();
            });
            self.$el.find("#save").unbind("click").bind("click", (event) => {

                self.model.save(null, {
                    success: function (model, response) {
                        self.close();
                        self.trigger("save");
                    },
                    error: function (model, xhr, options) {

                    }
                });
            });

            var previewEl = self.$el.find("#webview_preview");
            // this.$el.find("#sortable").sortable((event) => {
            //     console.log("event: ", event);
            // });
            // this.$el.find("#sortable").disableSelection((event) => {
            //     console.log("disableSelection: ", event);
            // });

            // $( "#draggable" ).draggable((event) => {
            //     console.log("event: ", event);
            // });

            $.each(self.$el.find("#uicontrols .elements"), (index, ele) => {
                $(ele).unbind("click").bind("click", () => {
                    var uiControlName = $(ele).attr("name");
                    if (uiControlMap[uiControlName]) {
                        var view = new uiControlMap[uiControlName]();
                        view.model.set("_id", Helper.generateHashKey('mix', 32, false));
                        view.model.set("position", Helper.utcTimestampNow());
                        view.render();
                        $(view.el).hide().appendTo(previewEl).fadeIn();

                        var fields = self.model.get("fields");
                        fields.push(view.model.toJSON());
                        self.model.set("fields", fields);

                        view.on("change", (data) => {

                            var fields = self.model.get("fields");
                            var flag = false;
                            fields.forEach((field, index) => {
                                if (field._id == data._id) {
                                    fields[index] = clone(data);
                                    flag = true;
                                }
                            });
                            if (flag === false) {
                                fields.push(data);
                                self.model.set("fields", fields);
                            }
                            self.model.set("fields", fields);
                        });
                    }
                });
            });
        },

        loadDefaultScreen: function () {

        },

        validate: function () {
            const self = this;
            if (self.model.get("action") && self.model.get("action").action_type != "hide_comment"
                && (!self.$el.find("#action-container textarea").val() || !self.$el.find("#action-container textarea").val().trim())) {
                self.$el.find("#action-container textarea").addClass("input-invalid");
                return false;
            }
            return true;
        }
    });

});