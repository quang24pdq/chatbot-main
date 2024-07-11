define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');
    var lodash = require('vendor/lodash/lodash');
    var FacebookSDK = require('app/common/FacebookSDK');

    var template = require('text!./tpl/configuration.html'),
        schema = require('json!schema/BotSchema.json');
    // var WitApps = require('json!app/common/WitApps.json');

    return Gonrin.ModelView.extend({
        modelIdAttribute: "_id",
        botInfo: null,
        template: '',
        modelSchema: schema,
        urlPrefix: "/api/v1/",
        collectionName: "bot",
        uiControls: {
            fields: [
                // {
                //     field: "wit",
                //     textField: "name",
                //     valueField: "_id",
                //     uicontrol: "combobox",
                //     dataSource: WitApps
                // }
            ]
        },

        render: function () {
            var self = this;
            var translatedTemplate = gonrin.template(template)(LANG);
            self.$el.html(translatedTemplate);
            self.applyBindings();
            self.checkSubscribedPage();

            return this;
        },

        /**
         * 
         * @param {*} bot_info 
         */
        checkSubscribedPage: function (bot_info = null) {
            var self = this
            var bot_id = this.getApp().getRouter().getParam("id");
            function check(data) {
                data = clone(data);
                const token = lodash.get(data, 'token', '');
                const page_id = lodash.get(data, 'page_id', null);

                if (!page_id) {
                    self.getPageList(bot_id);
                } else {
                    spinner.show();
                    FacebookSDK.getSubscribedPage(page_id, token).then(response => {
                        var ok = lodash.get(response, 'ok', false);
                        if (ok == true) {
                            var apps = lodash.get(response, 'apps', []);
                            for (var i = 0; i < apps.length; i++) {
                                var appInfo = apps[i];
                                if (!!appInfo && appInfo.namespace === self.getApp().appnamespace) {
                                    if (!!data.page_name) {
                                        data.name = data.page_name;
                                        data.id = data.page_id;
                                        data.token = data.token;
                                    }
                                    self.$el.find("#pages").html("");
                                    var el_item = self.renderPage(bot_id, data, true, true);
                                    self.$el.find("#pages").append(el_item);
                                    spinner.hide();
                                    return;
                                }
                            }
                            self.getPageList(bot_id);
                            spinner.hide();
                        } else {
                            spinner.hide();
                            self.getPageList(bot_id, {'refresh': true});
                        }
                    }).catch(error => {
                        console.log("ERROR ", error);
                        spinner.error();
                    });
                }
            }

            if (bot_info !== null) {
                check(bot_info);
            } else {
                var url = self.getApp().serviceURL;
                $.ajax({
                    url: url + '/api/v1/bot/' + bot_id,
                    method: "GET",
                    success: function (response) {
                        // self.registerWitControl(response);
                        check(response);
                    },
                    error: function (xhr, status, error) {
                        self.getPageList(bot_id);
                    },
                });
            }
        },
        /**
         * 
         * @param {*} bot_id 
         */
        getPageList: function (bot_id, options={}) {
            var self = this;
            spinner.show();
            FB.api('/me/accounts?fields=id,name,picture.type(large){url},access_token,token', { access_token: self.getApp().data('accessUserToken') }, function (response) {
                spinner.hide();
                var responseData = lodash.get(response, 'data', [])
                if (responseData && Array.isArray(responseData) && responseData.length > 0) {
                    $.ajax({
                        url: self.getApp().serviceURL + "/api/v1/bot/get_subscribed_bots",
                        type: "GET",
                        success: function (response) {
                            var bots = response;
                            var pageIds = bots.map((bot) => {
                                if (bot.page_id) {
                                    if (options && options.refresh == true && bot._id != bot_id) {
                                        return bot.page_id;
                                    } else if (!options || !options.refresh) {
                                        return bot.page_id;
                                    }
                                }
                            });
                            self.$el.find("#pages").empty();
                            var unconnectedPages = responseData.filter((page, index) => !pageIds.includes(page.id));
                            let connectedPages = responseData.filter((page, index) => pageIds.includes(page.id));
                            unconnectedPages.forEach((item, idx) => {
                                var page = clone(item);
                                var isEndBlock = false;
                                // if (idx == (unconnectedPages.length - 1)) {
                                //     isEndBlock = true;
                                // }
                                page.token = page.access_token;
                                page.page_profile_pic = lodash.get(page, 'picture.data.url', '');
                                var el_item = self.renderPage(bot_id, page, isEndBlock, false);
                                self.$el.find("#pages").append(el_item);
                            });

                            connectedPages.forEach((item, index) => {
                                var page = clone(item);
                                var isEndBlock = false;
                                // if (idx == (unconnectedPages.length - 1)) {
                                //     isEndBlock = true;
                                // }
                                page.token = page.access_token;
                                page.page_profile_pic = lodash.get(page, 'picture.data.url', '');

                                var el_item = self.renderConnectedPage(bot_id, page, isEndBlock, true);
                                self.$el.find("#pages").append(el_item);
                            })
                        },
                        error: function (xhr) { }
                    });
                }
            });
        },

        renderPage: function (bot_id, data, isEndBlock, subscribed) {
            var self = this;
            var el_item = $('<div>').attr({ 'class': 'form-inline' });
            var el_img_page = $('<img>').attr({ "src": data.page_profile_pic, "height": "50px;", "width": "50px;" });
            var el_page_name = $('<a>').attr({ 'href': 'https://facebook.com/page/' + data.id, "class": "label-page-name" }).html(data.name);
            var contain_published = $('<div>').attr({ "style": "float:right;" });
            var label_published = $('<span>').attr({ "style": "color: rgb(53, 198, 124); padding:6px;" }).html('<i class="fa fa-check-circle" aria-hidden="true"></i><label style="padding-left:5px;">' + LANG.CONFIGURATION_PUBLISHED + '</label>');
            var btn_disconnect = $('<a>').attr({ "href": "javascript:void(0);", "class": " btn btn-default" }).html(LANG.CONFIGURATION_DISCONNECT);
            var btn_connect = $('<a>').attr({ "href": "javascript:void(0);", "class": " btn btn-primary", "style": "float:right;" }).html(LANG.CONFIGURATION_CONNECT);
            el_item.append(el_img_page);
            el_item.append(el_page_name);
            el_item.append(contain_published);
            contain_published.append(label_published).append(btn_disconnect);
            el_item.append(btn_connect);
            if (subscribed === true) {
                btn_connect.hide();
                contain_published.show();
            } else {
                btn_connect.show();
                contain_published.hide();
            }
            if (isEndBlock !== true) {
                el_item.append('<hr>');
            }
            btn_connect.unbind('click').bind('click', { obj: data }, function (e) {
                var data_page = clone(e.data.obj);
                spinner.show();
                FacebookSDK.subscribed(data_page).then(response => {
                    spinner.hide();
                    var ok = lodash.get(response, 'ok', false);
                    var success = lodash.get(response, 'success', false);
                    if (ok == true || success == true) {
                        self.updateBot(bot_id, data_page, "subscribed");
                    } else {
                        spinner.error();
                    }
                }).catch(error => {
                    spinner.error();
                });
            });
            btn_disconnect.unbind('click').bind('click', { obj: data }, function (e) {
                var data_page = clone(e.data.obj);
                spinner.show();
                FacebookSDK.unsubscribed(data_page).then(response => {
                    spinner.hide();
                    var ok = lodash.get(response, 'ok', false);
                    var success = lodash.get(response, 'success', false);
                    if (ok == true || success == true) {
                        self.updateBot(bot_id, data_page, "unsubscribed");
                    } else {
                        spinner.error();
                    }
                }).catch(error => {
                    spinner.error();
                });
            });
            return el_item;
        },

        renderConnectedPage: function (bot_id, data, isEndBlock, subscribed) {
            var self = this;
            var el_item = $('<div>').attr({ 'class': 'form-inline' });
            var el_img_page = $('<img>').attr({ "src": data.page_profile_pic, "height": "50px;", "width": "50px;" });
            var el_page_name = $('<a>').attr({ 'href': 'https://facebook.com/page/' + data.id, "class": "label-page-name" }).html(data.name);
            var contain_published = $('<div>').attr({ "style": "float:right;" });
            var label_published = $('<span>').attr({ "style": "color: rgb(53, 198, 124); padding:6px;" }).html('<i class="fa fa-check-circle" aria-hidden="true"></i><label style="padding-left:5px;">' + LANG.CONFIGURATION_PUBLISHED + '</label>');
            var btn_disconnect = $('<a>').attr({ "href": "javascript:void(0);", "class": " btn btn-default" }).html(LANG.CONFIGURATION_DISCONNECT);
            var btn_connect = $('<a>').attr({ "href": "javascript:void(0);", "class": " btn btn-primary", "style": "float:right;" }).html(LANG.CONFIGURATION_CONNECT);
            el_item.append(el_img_page);
            el_item.append(el_page_name);
            el_item.append(contain_published);
            contain_published.append(label_published);
            el_item.append(btn_connect);
            if (subscribed === true) {
                btn_connect.hide();
                contain_published.show();
            } else {
                btn_connect.show();
                contain_published.hide();
            }
            if (isEndBlock !== true) {
                el_item.append('<hr>');
            }
            btn_connect.unbind('click').bind('click', { obj: data }, function (e) {
                var data_page = clone(e.data.obj);
                spinner.show();
                FacebookSDK.subscribed(data_page).then(response => {
                    spinner.hide();
                    var ok = lodash.get(response, 'ok', false);
                    var success = lodash.get(response, 'success', false);
                    if (ok == true || success == true) {
                        self.updateBot(bot_id, data_page, "subscribed");
                    } else {
                        spinner.error();
                    }
                }).catch(error => {
                    spinner.error();
                });
            });
            btn_disconnect.unbind('click').bind('click', { obj: data }, function (e) {
                var data_page = clone(e.data.obj);
                spinner.show();
                FacebookSDK.unsubscribed(data_page).then(response => {
                    spinner.hide();
                    var ok = lodash.get(response, 'ok', false);
                    var success = lodash.get(response, 'success', false);
                    if (ok == true || success == true) {
                        self.updateBot(bot_id, data_page, "unsubscribed");
                    } else {
                        spinner.error();
                    }
                }).catch(error => {
                    spinner.error();
                });
            });
            return el_item;
        },

        registerWitControl: function (bot_info) {
            const self = this;
            if (!bot_info) {
                return;
            }
            var defaultWit = lodash.get(bot_info, 'wit._id', null);
        },


        updateBot: function (bot_id, data_page, action) {
            var self = this;
            var data = {
                "page_id": data_page.id,
                "token": data_page.token,
                "action": action
            };
            var bot_info = null;
            spinner.show();
            $.ajax({
                url: self.getApp().serviceURL + '/api/v1/bot/' + bot_id,
                method: "PUT",
                data: JSON.stringify(data),
                success: function (data) {
                    spinner.hide();
                    bot_info = data;
                },
                error: function (xhr, status, error) {
                    spinner.error()
                },
                complete: function (data) {
                    // self.registerWitControl(bot_info);
                    self.checkSubscribedPage(bot_info);
                }
            });
        }
    });

});
