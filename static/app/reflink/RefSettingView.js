define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');
    var Clipboard = require('vendor/clipboard/clipboard');
    var template = require('text!./tpl/setting-view.html');

    return Gonrin.DialogView.extend({
        template: template,
        botInfo: null,
        uiControl: {
            fields: []
        },

        tools: null,

    	/**
    	 *
    	 */
        render: function () {
            var self = this;
            self.initialize();
            self.loadData();
            self.eventRegister();
            return this;
        },

        initialize: function () {
            var self = this;
            if (!self.viewData) {
                self.viewData = {
                    active: false,
                    param: null
                }
            }
        },

        loadData: function () {
            var self = this;
            console.log(self.botInfo);
            if (!self.botInfo) {
                var botId = self.getApp().getRouter().getParam("id");
                $.ajax({
                    url: self.getApp().serviceURL + "/api/v1/bot/" + botId,
                    type: "GET",
                    contentType: "application/json",
                    success: function (response) {
                        if (response && response.page_id) {
                            self.$el.find("#messenger-link").val("https://m.me/" + response.page_id + "?ref=");
                        } else {
                            self.$el.find("#messenger-link").val("https://m.me/your-page-id?ref=");
                        }
                    }
                })
            } else {
                if (self.botInfo && self.botInfo.page_id) {
                    self.$el.find("#messenger-link").val("https://m.me/" + self.botInfo.page_id + "?ref=");
                } else {
                    self.$el.find("#messenger-link").val("https://m.me/your-page-id?ref=");
                }
            }
            self.$el.find("#ref-link-value").val(self.viewData.param);
        },

        eventRegister: function () {
            var self = this;
            self.$el.find("#enable-btn").unbind("click").bind("click", function () {

                if (self.$el.find("#enable-data").val() != "enabled") {
                    self.$el.find("#enable-btn").addClass("ref-active");
                    self.$el.find("#enable-btn").html("Working");
                    self.$el.find("#enable-data").val("enabled");

                    self.$el.find(".extend-area").each(function () {
                        $(this).removeClass("ref-hidden");
                    });
                    self.viewData.active = true;

                } else {
                    self.$el.find("#enable-btn").html("Active")
                    self.$el.find("#enable-btn").removeClass("ref-active");
                    self.$el.find("#enable-data").val("disabled");

                    self.$el.find(".extend-area").each(function () {
                        $(this).addClass("ref-hidden");
                    });
                    self.viewData.active = false;
                }
            });

            self.$el.find("#ref-link-value").keyup(function ($event) {
                self.viewData.param = self.$el.find("#ref-link-value").val();
            });
            //
            if (self.viewData && self.viewData.active == true) {
                self.$el.find("#enable-btn").trigger("click");
            }

            // handle save when done
            self.$el.find("#done").unbind("click").bind("click", function () {
                self.trigger("save", self.viewData);
                self.close();

            });

            // copy URL


            self.$el.find("#copy").unbind("click").bind("click", function () {
                if (self.viewData.active) {
                    var messenger_link = self.$el.find("#messenger-link").val();
                    var param = self.$el.find("#ref-link-value").val();

                    self.$el.find("#copy").attr({
                        "data-clipboard-demo": "",
                        "data-clipboard-action": "copy",
                        "data-clipboard-text": messenger_link + param,
                    });

                    var clipboard = new Clipboard('.btn');
                    self.close();
                    self.getApp().notify({ message: "Copied" }, { type: "success", delay: 100 });
                }
            })
        },

        fallbackCopyTextToClipboard: function (text) {
            var textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                var successful = document.execCommand('copy');
                var msg = successful ? 'successful' : 'unsuccessful';
                console.log('Fallback: Copying text command was ' + msg);
            } catch (err) {
                console.error('Fallback: Oops, unable to copy', err);
            }

            document.body.removeChild(textArea);
        },

        copyTextToClipboard: function (text) {
            var self = this;
            if (!navigator.clipboard) {
                self.fallbackCopyTextToClipboard(text);
                return;
            }
            navigator.clipboard.writeText(text).then(function () {
                console.log('Async: Copying to clipboard was successful!');
            }, function (err) {
                console.error('Async: Could not copy text: ', err);
            });
        }
    });

});
