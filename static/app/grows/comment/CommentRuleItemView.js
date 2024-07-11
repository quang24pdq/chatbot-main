define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');
    var template = require('text!./tpl/comment-rule-item.html');

    var schema = {
        "_id": {
            type: "string"
        },
        "name": {
            type: "string"
        }
    };
    return Gonrin.ModelView.extend({
        template: template,
        modelSchema: schema,
        urlPrefix: "/api/v1/",
        collectionName: "feed_item",
        render: function () {
            var self = this;
            self.model.set("name", (this.viewData && this.viewData.name) ? this.viewData.name : "New Rule");
            self.model.set("_id", this.viewData._id);
            self.$el.find("#item_rule").find("label").html(this.model.get("name"));
            self.$el.find(".auisgda").prop("id", self.model.get("_id"));
            self.$el.find(".close").unbind("click").bind("click", function () {
                //delete rule view
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
            })
        }
    });

});