define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');
    var template = require('text!./tpl/model.html'),
        schema = require('json!schema/PersistentMenuSchema.json'),
        buttonSchema = require('json!schema/ButtonSchema.json');
    var ButtonView = require("app/persistent_menu/ButtonControlView");

    return Gonrin.ModelView.extend({
        bindings: "card-text-bind",
        template: null,
        modelSchema: schema,
        urlPrefix: "/api/v1/",
        collectionName: "persistent_menu",

        render: function () {
            var self = this;
            var translatedTemplate = gonrin.template(template)(LANG);
            self.$el.html(translatedTemplate);
            //var id = self.viewData.id;
            var bot_id = this.getApp().getRouter().getParam("id");
            var url = self.getApp().serviceURL + "/api/v1/persistent_menu";
            var filters = { bot_id: bot_id };
            loader.show();
            $.ajax({
                url: url,
                data: { q: JSON.stringify({ filters: filters, single: true }) },
                method: "GET",
                contentType: "application/json",
                success: function (data) {
                    self.model.set(data);
                    self.applyBindings();
                    self.renderButtons();
                    self.registerEvents();
                    self.renderReview();
                    loader.hide();
                },
                error: function (xhr, error, errorThrown) {
                    if (xhr.responseJSON && xhr.responseJSON.error_code == "NOT_FOUND") {
                        loader.hide();
                    } else {
                        loader.error();
                    }
                    self.model.set("bot_id", bot_id);
                    self.applyBindings();
                    self.renderButtons();
                    self.registerEvents();
                    self.renderReview();
                }
            });
        },
        registerEvents: function () {
            var self = this;
            var bot_id = this.getApp().getRouter().getParam("id");
            self.$el.find("#btn_apply_persistent_menu").unbind("click").bind("click", () => {
                spinner.show();
                $.ajax({
                    type: "GET",
                    url: self.getApp().serviceURL + "/api/v1/persistent_menu/apply",
                    data: {
                        "bot_id": bot_id
                    },
                    success: function (response) {
                        spinner.hide();
                    },
                    error: function (xhr) {
                        spinner.hide();
                    }
                })
            });

            self.$el.find("#add_button").unbind("click").bind("click", function () {
                if (self.model.get("buttons").length < 3) {
                    var data = Gonrin.getDefaultModel(buttonSchema);
                    data['_id'] = gonrin.uuid();
                    data["title"] = LANG.PERSISTENT_MENU_NEW_BTN;
                    self.model.get("buttons").push(data);
                    self.model.trigger("change");
                }
                else {
                    loader.error("không thể tạo thêm nút");
                }
            });
            self.model.on("change", function () {
                loader.show();
                self.model.save(null, {
                    success: function (model, respose, options) {
                        loader.saved();
                        self.renderButtons();
                        self.renderReview();
                    },
                    error: function (model, xhr, options) {
                        console.log(model);
                        loader.error();
                    }
                });
            });
        },
        //fetchPersistentmenu: function () {
        renderButtons: function () {
            var self = this;
            self.$el.find("#buttons-container").empty();
            var buttons = self.model.get("buttons");
            if (!!buttons && (buttons.length > 0)) {
                buttons.forEach((btn, idx) => {
                    self.renderButton(btn, idx);
                });
            }
        },
        renderButton: function (data, index) {
            var self = this;
            var view = new ButtonView();
            view.model.set(data);
            view.render();
            self.$el.find("#buttons-container").append(view.$el);

            view.on("change", function (event) {
                var buttons = self.model.get("buttons");

                if (Array.isArray(buttons)) {
                    buttons.forEach((btn, idx) => {
                        if (btn._id == event._id) {
                            buttons[idx] = event;
                        }
                    });
                } else {
                    buttons = [event];
                }
                self.model.set("buttons", buttons);
                self.model.trigger("change");
            });

            view.on("delete", function (event) {
                var buttons = self.model.get("buttons");
                if (Array.isArray(buttons)) {
                    buttons.forEach((btn, idx) => {
                        if (btn._id == event._id) {
                            buttons.splice(idx, 1);
                        }
                    });
                }
                self.model.set("buttons", buttons);
                self.model.trigger("change");
            });
        },

        renderReview: function () {
            const self = this;
            var botId = this.getApp().getRouter().getParam("id");
            self.$el.find("#persistent-review").find("img.page-image").attr({ "src": "https://static.upgo.vn/images/default-bot-icon.png" });
            self.$el.find("#persistent-review").find("#page-name").html("&nbsp");
            if (botId) {
                $.ajax({
                    url: self.getApp().serviceURL + "/api/v1/bot/" + botId,
                    type: "GET",
                    success: function (response) {
                        if (response) {
                            var page_logo = response.page_logo;
                            if (!page_logo) {
                                page_logo = response.page_profile_pic ? response.page_profile_pic : "https://static.upgo.vn/images/default-bot-icon.png";
                            }

                            self.$el.find("#persistent-review").find("img.page-image").attr({ "src": page_logo });
                            self.$el.find("#persistent-review").find("#page-name").html(response.page_name ? response.page_name : "&nbsp");
                        }
                    }
                })
            }

            var reviewButtonEl = self.$el.find("#persistent-review").find(".button-review");
            reviewButtonEl.empty();
            var buttons = self.model.get("buttons");
            buttons.forEach((btn, idx) => {
                if (idx == 0) {
                    reviewButtonEl.append(`
                        <div style="width: 100%; padding: 4px 5px;font-weight: 300;">${btn.title}</div>
                    `)
                } else {
                    reviewButtonEl.append(`
                    <div style="width: 100%; padding: 4px 5px;font-weight: 300; border-top: 0.5px solid lightgray;">${btn.title}</div>
                    `)
                }
            });
        }
    });

});