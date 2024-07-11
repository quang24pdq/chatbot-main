define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');

    var lodash = require('vendor/lodash/lodash');
    var template = require('text!./tpl/center-menu.html');
    var Helper = require("app/common/Helpers");


    var arr = {};

    return Gonrin.ModelView.extend({
        template: '',
        modelSchema: {},

        render: function () {
            var self = this;
            var translatedTemplate = gonrin.template(template)(LANG);
            self.$el.html(translatedTemplate);
            self.applyBindings();
            self.fetchMessagesUser();
            self.fetchMessagesPage();

            var id = self.model.get("id");
            self.renderInput(id);

            console.log("Arr", arr);
        },

        renderInput: function (id) {
            var self = this;
            var html = `<input id="input-message-${id}" class="input-message" placeholder="Send message..." type="text" />`;
            self.$el.find(".livechat-message-input").html(html);
        },

        fetchMessagesUser: function () {
            const self = this;
            var id = self.model.get("id");
            $.ajax({
                url: self.getApp().serviceURL + "/api/v1/message/get_message_user",
                type: "POST",
                data: JSON.stringify({
                    "id": id
                }),
                contentType: "application/json",
                dataType: 'json',
                success: function (response) {
                    var data = clone(response);
                    // lodash.orderBy(data, ["create_at"], ["desc"])

                    if (data.length < 1) {
                        self.sendMessage(data);
                    } else {
                        data.forEach((item, idx) => {
                            arr = item;

                            console.log("Arrr", arr)
                            if (idx == data.length - 1) {
                                self.sendMessage(item);
                            }
                            // if (item.contact_id == self.model.get("id")) {
                                self.renderMessageUser(item);
                            // }
                        });
                    }

                    loader.saved();
                },
                error: function (error) {
                    loader.error();
                }
            });

        },

        fetchMessagesPage: function () {
            const self = this;
            $.ajax({
                url: self.getApp().serviceURL + "/api/v1/message/get_message_page",
                type: "POST",
                data: JSON.stringify({
                    "page_id": self.model.get("page_id"),
                    "contact_id": self.model.get("id")
                }),
                contentType: "application/json",
                dataType: 'json',
                success: function (response) {
                    response.forEach(item => {
                        self.renderMessagePage(item);
                    });
                    loader.saved();
                },
                error: function (error) {
                    loader.error();
                }
            });
        },

        renderMessageUser: function (data) {
            const self = this;
            var html = "";
            var create_at = Helper.utcToLocal(data.create_at * 1000, "HH:mm");
            if (data.message) {
                html = `<div class="message-title"><span>${create_at}</span></div>
                    <div class="row">
                        <div style="float: left; margin-left: 15px;">
                            <img class="avatar-chat"
                                src="${self.model.get("profile_pic")}" width="40px"
                                height="40px" />
                        </div>
                        <div style="margin: 10px" class="message-text-user col-lg-6">${data.message.text}</div>
                    </div>`;
            }
            self.$el.find("#page-chat").append(html);

        },

        renderMessagePage: function (data) {
            const self = this;
            var html = "";
            if (data) {
                html += `<div class="row" style="margin: 20px 0px;">
                    <div class="" style="text-align: right;width: 245px; float: right;">
                        <div style="width: auto; float: right; background-color: #09f; color: white; padding: 3px 15px; border-radius: 10px;">${data.text}</div>
                    </div></div>`;

                self.$el.find("#page-chat").append(html);
            }
        },

        sendMessage: function (source) {
            const self = this;
            var create_at = 0;
            if (source.length < 1) {
                create_at = Helper.utcTimestampNow() / 1000;
            } else {
                create_at = source.create_at;
            }

            self.$el.find('#input-message-' + self.model.get("id")).keypress(function (event) {
                if (event.keyCode == 13 || event.which == 13) {
                    event.preventDefault();
                    $.ajax({
                        url: self.getApp().serviceURL + "/api/v1/livechat/send",
                        type: "POST",
                        data: JSON.stringify({
                            "contact_id": self.model.get("id"),
                            "text": self.$el.find("#input-message-" + self.model.get("id")).val(),
                            "page_id": self.model.get("page_id"),
                            "create_at": create_at
                        }),
                        contentType: "application/json",
                        dataType: 'json',
                        success: function (response) {
                            if (response) {
                                response.forEach(item => {
                                    var create_at = Helper.utcToLocal(item.create_at * 1000, "HH:mm");
                                    html = `<div class="message-title"><span>${create_at}</span></div>
                                    <div class="row">
                                        <div style="float: left; margin-left: 15px;">
                                            <img class="avatar-chat"
                                                src="${self.model.get("profile_pic")}" width="40px"
                                                height="40px" />
                                        </div>
                                        <div style="margin: 10px" class="message-text-user col-lg-6">${item.message.text}</div>
                                    </div>`;
                                    self.$el.find("#page-chat").append(html);
                                });

                                var html = `<div class="row" style="margin: 20px 0px;">
                                <div class="" style="text-align: right;width: 190px; float: right;">
                                    <div style="width: auto; float: right; background-color: #09f; color: white; padding: 3px 15px; border-radius: 10px;">${self.$el.find("#input-message-" + self.model.get("id")).val()}</div>
                                </div></div>`;

                                self.$el.find("#page-chat").append(html);
                            }
                            loader.saved();
                        },
                        error: function (error) {
                            loader.error();
                        }
                    });
                }
            });

        },
    });

});
