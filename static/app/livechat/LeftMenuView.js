define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');

    var template = require('text!./tpl/left-menu.html');


    return Gonrin.ModelView.extend({
        template: '',
        modelSchema: {},

        render: function () {
            var self = this;
            var translatedTemplate = gonrin.template(template)(LANG);
            self.$el.html(translatedTemplate);
            self.applyBindings();
            self.fetchContacts();

        },

        fetchContacts: function () {
            const self = this;
            var botId = self.getApp().getRouter().getParam("id");
            loader.show();
            $.ajax({
                url: self.getApp().serviceURL + "/api/v1/contact/get_all_contact",
                type: "POST",
                data: JSON.stringify({
                    "bot_id": botId
                }),
                contentType: "application/json",
                dataType: 'json',
                success: function (response) {
                    self.renderContact(response);
                    loader.saved();
                },
                error: function (error) {
                    loader.error();
                }
            });
        },

        renderContact: function (data) {
            const self = this;
            var html = "";
            data.forEach((item, inx) => {
                html = `<ul class="navbar-nav" style="list-style-type: none; margin: 15px">
                            <li class="nav-item">
                            <img id="avatar-chat-${item.id}" class="avatar-chat"
                                src="${item.profile_pic}" width="50px" height="50px" />
                                <a style="text-decoration: none; color: #333; font-size: 15px; margin-left: 7px;" class="nav-link" id="profile-user-${item.id}" page-id=${item.page_id} data-id="${item.id}" href="javascript:void(0);">${item.name}</a>
                            </li>
                        </ul>`

                self.$el.find("#left-live-chat").append(html);
                self.$el.find("#profile-user-" + item.id).unbind("click").bind("click", function () {
                    self.trigger("change-item", item);

                });
            });
        },

        // fetchMessages: function (data, html) {
        //     const self = this;
        //     self.$el.find(".left-live-chat").append(html);
        //     self.$el.find("#profile-user-" + data.id).unbind("click").bind("click", function () {
        //         var contactID = self.$el.find("#profile-user-" + data.id).attr("data-id");

        //         $.ajax({
        //             url: self.getApp().serviceURL + "/api/v1/message/get_message_by_contact_id",
        //             type: "POST",
        //             data: JSON.stringify({
        //                 "id": contactID
        //             }),
        //             contentType: "application/json",
        //             dataType: 'json',
        //             success: function (response) {
        //                 response.forEach(item => {
        //                     if (item.contact_id == contactID) {
        //                         self.renderMessage(item);
        //                     }
        //                 });
        //                 loader.saved();
        //             },
        //             error: function (error) {
        //                 loader.error();
        //             }
        //         });

        //     });
        // },

        // renderMessage: function (data) {
        //     const self = this;
        //     var html = `<div class="message-title"><span>13 March 10:11</span></div>
        //                     <div class="user-chat">
        //                         <div>
        //                             <img class="avatar-chat"
        //                                 src="https://i.pinimg.com/originals/9e/41/0f/9e410f16c7e319bb81b618bcbdae1f67.jpg" width="40px"
        //                                 height="40px" />
        //                             <span>${data.message.text}</span>
        //                         </div>
        //                 </div>`;
        //     self.$el.find("#user-chat").append(html);
        // },
    });

});
