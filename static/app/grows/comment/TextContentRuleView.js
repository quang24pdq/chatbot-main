define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');

    var template = require('text!./tpl/text-content-rule.html');
    var TemplateHelper = require('app/common/TemplateHelper');

    var schema = {
        "_id": {
            "type": "string",
            "primary": true
        },
        "text": {
            "type": "list"
        }
    };
    return Gonrin.ModelView.extend({
        template: '',
        modelSchema: schema,
        urlPrefix: "/api/v1/",
        collectionName: "grow",
        render: function () {
            var self = this;
            var translatedTemplate = gonrin.template(template)(LANG);
            self.$el.html(translatedTemplate);
            if (this.viewData) {
                self.model.set(this.viewData);
            }
            self.newUiControl();
            self.$el.find("#btn-delele-rule").unbind("click").bind("click", function () {
                //delete rule view
                $.confirm({
                    title: 'Confirm!',
                    content: 'Are your sure?',
                    buttons: {
                        delete: {
                            btnClass: "btn-danger",
                            action: function () {
                                self.trigger("delete");
                                self.remove();
                            }
                        },
                        cancel: function () {
                            // self.getApp().notify({message: "Canceled"}, {type: "info", delay: 100});
                        }
                    }
                });
            })
        },
        newUiControl: function () {
            var self = this;
            self.$el.find("input[name='typing']").attr("id", self.model.get("_id") + "-typing");
            self.$el.find("div[name='list-data']").attr("id", self.model.get("_id") + "-list-data");

            self.$el.find(".rule").find("input[name='typing']").keypress(function ($event) {
                if ($event.which == 13) {
                    $event.preventDefault();
                    if ($event.target.value) {
                        var modelData = self.model.get("text") ? self.model.get("text") : [];
                        modelData.push($event.target.value);
                        self.model.set("text", modelData);
                        self.dataRender(self.model.get("text"));
                        self.$el.find(".rule").find("input[name='typing']").val("");
                        self.trigger('change', self.model.get("text"));
                    }
                }
            });

            self.dataRender(self.model.get("text"));
        },
        dataRender: function (data = []) {
            var self = this;
            self.$el.find(".rule").find("#list-data").empty();
            if (!data) {
                data = [];
            }
            data.forEach(function (item, index) {
                self.$el.find(".rule").find("#list-data").append(`
                    <div class="word">
                    ${item}
                    <span id="del-${index}" class="glyphicon glyphicon-remove del-word"></span>
                    </div>
                `);
            });
            // wait 0.2s for loading element
            var timer = setTimeout(function () {
                data.forEach(function (rule, index) {
                    $("#del-" + index).unbind("click").bind("click", function () {
                        data.splice(index, 1);
                        self.model.set("text", data);
                        self.dataRender(self.model.get("text"));
                        self.trigger('change', self.model.get("text"));
                    })
                })
                clearTimeout(timer);
            }, 200)
        },
    });

});