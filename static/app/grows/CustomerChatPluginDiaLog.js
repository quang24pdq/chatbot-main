define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');
    var template = require('text!./tpl/customer-chat-plugin.html');

    return Gonrin.DialogView.extend({
        template: template,
        modelSchema: [],

        render: function () {
            const self = this;
            self.registerEvent();
        },

        registerEvent: function () {
            const self = this;
            var botId = self.getApp().getRouter().getParam("id");
            self.$el.find("#domain").unbind("change").bind("change", function () {
                var domain = self.$el.find("#domain").val();
                if (domain && domain.trim()) {
                    loader.show();
                    $.ajax({
                        url: self.getApp().serviceURL + "/api/v1/facebook/chat-plugin",
                        data: JSON.stringify({
                            "bot_id": botId,
                            "whitelisted_domains": [domain]
                        }),
                        type: "POST",
                        success: function(response) {
                            loader.hide();
                            var pageId = lodash.get(response, 'page_id', null);
                            self.renderPlugin(pageId);
                        },
                        error: function() {
                            loader.error();
                        }
                    });
                }
            });


            self.$el.find("#copy_script").unbind("click").bind("click", function () {
                var copyText = document.getElementById("code_view");
                copyText.select();
                document.execCommand("copy");
            });
        },

        renderPlugin: function(page_id) {
            const self = this;
            if (!page_id) {
                return;
            }
            var html = `<script>
            var div = document.createElement('div');div.className = 'fb-customerchat';
            div.setAttribute('page_id', '${page_id}');
            div.setAttribute('ref', '');
            document.body.appendChild(div);
            window.fbMessengerPlugins = window.fbMessengerPlugins || {
                init: function () {
                FB.init({
                    appId            : ${fb_app_id},
                    autoLogAppEvents : true,
                    xfbml            : true,
                    version          : '${graph_version}'
                });
                }, callable: []
            };
            window.fbAsyncInit = window.fbAsyncInit || function () {
                window.fbMessengerPlugins.callable.forEach(function (item) { item(); });
                window.fbMessengerPlugins.init();
            };
            setTimeout(function () {
                (function (d, s, id) {
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) { return; }
                js = d.createElement(s);
                js.id = id;
                js.src = "//connect.facebook.net/en_US/sdk/xfbml.customerchat.js";
                fjs.parentNode.insertBefore(js, fjs);
                }(document, 'script', 'facebook-jssdk'));
            }, 0);
            </script>`;
            self.$el.find("#code_view").val(html);
        }

    });
});