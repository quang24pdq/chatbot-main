define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');
    var template = require('text!./tpl/webview-item-view.html');
    var WebviewSettingDialogView = require('app/webview/WebviewSettingDialogView');

    var schema = {
        "_id": {
            type: "string"
        },
        "title": {
            type: "string"
        }
    };
    return Gonrin.ModelView.extend({
        template: template,
        modelSchema: schema,
        urlPrefix: "/api/v1/",
        collectionName: "webview",
        render: function () {
            var self = this;
            self.model.set("title", (this.viewData && this.viewData.title) ? this.viewData.title : "New Embeded Webview");
            self.model.set("_id", this.viewData._id);
            self.$el.find("#webview_item").find("label").html(this.model.get("title"));
            self.$el.find(".auisgda").prop("id", self.model.get("_id"));
            self.$el.find(".close").unbind("click").bind("click", function () {
                $.confirm({
                    title: 'Confirm!',
                    content: 'Are your sure?',
                    buttons: {
                        delete: {
                            btnClass: "btn-danger",
                            action: function () {
                                self.trigger("deleted", self.model.toJSON());
                                self.remove();
                            }
                        },
                        cancel: function () {
                        }
                    }
                });
            });

            self.$el.unbind('click').bind('click', (event) => {
                var webviewSetting = new WebviewSettingDialogView();
                webviewSetting.model.set(self.viewData);
                webviewSetting.dialog({
                    size: "large"
                });

                webviewSetting.on("save", (data) => {
                    self.trigger("change");
                });
            });
        }
    });

});