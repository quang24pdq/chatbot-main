define(function (require) {
    "use strict";
    var self = this;
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');

    var template = require('text!./tpl/default-rule-view.html');
    var BlockSelectView = require("app/block/SelectView");
    var ruleSchema = require('json!schema/RuleSchema.json')
    var replyTypes = [
        { "value": "block", "text": "Block" },
        { "value": "text", "text": "Text" }
    ];
    return Gonrin.ModelView.extend({
        template: '',
        modelSchema: ruleSchema,
        urlPrefix: "/api/v1/",
        collectionName: "rule",
        uiControl: {
            fields: [
                {
                    field: "block",
                    uicontrol: "ref",
                    textField: "name",
                    selectionMode: "single",
                    dataSource: BlockSelectView
                },
                {
                    field: "type",
                    uicontrol: "combobox",
                    textField: "text",
                    valueField: "value",
                    dataSource: clone(replyTypes),
                },
                {
                    field: "intent",
                    uicontrol: "combobox",
                    textField: "label",
                    valueField: "name",
                    dataSource: [],
                }
            ]
        },

        render: function () {
            var self = this;
            var translatedTemplate = gonrin.template(template)(LANG);
            self.$el.html(translatedTemplate);
            // var intents = lodash.get(self.viewData, 'intents', []);
            // var intentMap = intents.map((intent, idx) => {
            //     if (LANG.WIT_AI && LANG.WIT_AI.INTENTS && LANG.WIT_AI.INTENTS[intent.name]) {
            //         intent['label'] = LANG.WIT_AI.INTENTS[intent.name];
            //         return intent
            //     } else {
            //         intent['label'] = intent.name + " (beta)";
            //         return intent
            //     }
            // });
            // intentMap.unshift({
            //     'name': 'do_not_use',
            //     'label': LANG.WIT_AI['do_not_use']
            // })
            // self.uiControl.fields[2].dataSource = intentMap;
            self.applyBindings();

            self.changeReplyView();
            self.model.on("change", function () {
                loader.show();
                self.model.set("default", true);
                self.model.save(null, {
                    success: function (model, response) {
                        loader.saved();
                    },
                    error: function (model, xhr, options) {
                        loader.error();
                    }
                })
                self.changeReplyView();
            });

            self.$el.find("#btn-delele-rule").unbind("click").bind("click", function () {
                //delete rule view
                $.confirm({
                    title: 'Confirm!',
                    content: 'Are your sure?',
                    buttons: {
                        delete: {
                            btnClass: "btn-danger",
                            action: function () {
                                self.trigger("rule_deleted");
                                self.remove();
                            }
                        },
                        cancel: function () {
                        }
                    }
                });
            })
        },

        changeReplyView: function () {
            var self = this;
            if (self.model.get("type") && self.model.get("type").toLowerCase() == "block") {
                if (self.$el.find("#reply-block").hasClass("hidden")) {
                    self.$el.find("#reply-block").removeClass("hidden");
                }
                if (!self.$el.find("#reply-text").hasClass("hidden")) {
                    self.$el.find("#reply-text").addClass("hidden");
                }
            } else {
                if (self.$el.find("#reply-text").hasClass("hidden")) {
                    self.$el.find("#reply-text").removeClass("hidden");
                }
                if (!self.$el.find("#reply-block").hasClass("hidden")) {
                    self.$el.find("#reply-block").addClass("hidden");
                }
            }
        }
    })
})
