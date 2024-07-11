define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');

    var template = require('text!./tpl/setup-ai-view.html');
    var ruleSchema = require('json!schema/RuleSchema.json');
    var RuleView = require("app/setup_ai/RuleView");
    var DefaultRuleView = require("app/setup_ai/DefaultRuleView");

    var AiRuleImportDialog = require("app/setup_ai/AiRuleImportDialog");

    return Gonrin.ModelView.extend({
        modelIdAttribute: "_id",
        template: '',
        modelSchema: ruleSchema,
        urlPrefix: "/api/v1/",
        collectionName: "rule",
        intents: [],

        render: function () {
            var self = this;
            var translatedTemplate = gonrin.template(template)(LANG);
            self.$el.html(translatedTemplate);
            self.applyBindings();
            var bot_id = this.getApp().getRouter().getParam("id");
            if (bot_id) {
                self.loadDefaultData(() => {
                    var filters = {
                        "bot_id": bot_id
                    };
                    loader.show();
                    $.ajax({
                        url: self.getApp().serviceURL + "/api/v1/rules",
                        data: {
                            q: JSON.stringify({
                                filters: filters
                            })
                        },
                        type: "GET",
                        success: function (response) {
                            if (response && response.objects && response.objects.length > 0) {
                                $.each(response.objects, function (idx, rule) {
                                    if (rule.default === true) {
                                        self.renderDefaultRule(rule);
                                    } else {
                                        self.renderRule(clone(rule));
                                    }
                                })
                            }
                            loader.hide();
                        },
                        error: function (xhr) {
                            console.log(">>>> ", xhr);
                            loader.error();
                        }
                    });
                })
            }

            self.registerEvents();
            self.applyBindings();
        },


        loadDefaultData: function (callback=null) {
            const self = this;
            var bot_id = this.getApp().getRouter().getParam("id");
            loader.show();
            $.ajax({
                url: self.getApp().serviceURL + "/api/v1/wit/intents",
                data: {
                    'id': bot_id
                },
                type: "GET",
                success: function (response) {
                    self.intents = response;
                    loader.hide();
                    if (callback) {
                        callback();
                    }
                },
                error: function (xhr) {
                    loader.error();
                    if (callback) {
                        callback();
                    }
                }
            });
        },

        registerEvents: function () {
            var self = this;
            self.$el.find("#add-rule-btn").unbind("click").bind("click", function () {
                self.addNewRule();
            });

            self.$el.find("#btn_add_default_rule").unbind("click").bind("click", function () {
                self.addNewDefaultRule();
            });

            this.$el.find("#btn_import_excel").unbind("click").bind("click", () => {
                let importDialog = new AiRuleImportDialog();
                importDialog.dialog();
                importDialog.on("uploaded", () => {
                    self.getApp().notify({message: "Upload thành công"}, {type: "success"});
                    importDialog.close();
                    setTimeout(() => {
                        location.reload();
                    }, 500);
                });
                importDialog.on("error", () => {
                    self.getApp().notify({message: "Upload thất bại"}, {type: "danger"});
                    importDialog.close();
                });
            });
        },


        addNewRule: function () {
            var self = this;
            var bot_id = this.getApp().getRouter().getParam("id");
            var view = new RuleView({
                'viewData': {
                    'intents': self.intents
                }
            });
            view.model.set("bot_id", bot_id);
            view.model.set("text", []);
            loader.show();
            view.model.save(null, {
                success: function (model, respose, options) {
                    loader.saved();
                    self.renderRule(view.model.toJSON(), true);
                },
                error: function (model, xhr, options) {
                    loader.error();
                }
            });
        },

        renderRule: function (data, atHead = false) {
            var self = this;
            var view = clone(null);
            view = new RuleView({
                'viewData': {
                    'intents': clone(self.intents)
                }
            });
            // view.$el.find("")
            view.model.set(data);
            view.render();
            if (atHead == true) {
                self.$el.find("#rules-container").prepend(view.$el);
            } else {
                self.$el.find("#rules-container").append(view.$el);
            }

            view.on("rule_change", function ($event) {
                loader.show();
                view.model.save(null, {
                    success: function (model, response) {
                        loader.saved();
                    },
                    error: function (model, xhr, options) {
                        loader.error();
                    }
                });
            });

            view.on("rule_deleted", function ($event) {
                loader.show();
                view.model.destroy({
                    success: function (model, response) {
                        loader.saved();
                    },
                    error: function (model, xhr, options) {
                        loader.error();
                    }
                });
            });
        },


        addNewDefaultRule: function () {
            var self = this;
            var bot_id = this.getApp().getRouter().getParam("id");
            var view = new DefaultRuleView();
            view.model.set("bot_id", bot_id);
            view.model.set("default", true);
            view.model.set("text", []);
            loader.show();
            view.model.save(null, {
                success: function (model, respose, options) {
                    loader.saved();
                    self.renderDefaultRule(view.model.toJSON(), true);
                },
                error: function (model, xhr, options) {
                    loader.error();
                }
            });
        },

        renderDefaultRule: function(data, atHead = false) {
            const self = this;
            var view = clone(null);
            view = new DefaultRuleView();
            // view.$el.find("")
            view.model.set(data);
            view.render();
            if (atHead == true) {
                self.$el.find("#default-rules").prepend(view.$el);
            } else {
                self.$el.find("#default-rules").append(view.$el);
            }

            view.on("rule_change", function ($event) {
                loader.show();
                view.model.save(null, {
                    success: function (model, response) {
                        loader.saved();
                    },
                    error: function (model, xhr, options) {
                        loader.error();
                    }
                });
            });

            view.on("rule_deleted", function ($event) {
                loader.show();
                view.model.destroy({
                    success: function (model, response) {
                        loader.saved();
                    },
                    error: function (model, xhr, options) {
                        loader.error();
                    }
                });
            });
        }

    });

});
