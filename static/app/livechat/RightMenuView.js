define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');

    var template = require('text!./tpl/right-menu.html');


    return Gonrin.ModelView.extend({
        template: '',
        modelSchema: {},

        render: function () {
            var self = this;
            var translatedTemplate = gonrin.template(template)(LANG);
            self.$el.html(translatedTemplate);
            self.applyBindings();
            self.bindData();

            console.log(self.model.toJSON());
        },

        bindData: function () {
            const self = this;
            self.$el.find("#first_name").text(self.model.get("first_name"));
            self.$el.find("#last_name").text(self.model.get("last_name"));
            self.$el.find("#page_id").text(self.model.get("page_id"));
            self.$el.find("#phone").text(self.model.get("phone"));
            self.$el.find("#contact_type").text(self.model.get("contact_type"));
            self.$el.find("#bot_id").text(self.model.get("bot_id"));
            self.$el.find("#id").text(self.model.get("id"));
            self.$el.find("#name").text(self.model.get("name"));
            self.$el.find("#locale").text(self.model.get("locale"));
            self.$el.find("#timezone").text(self.model.get("timezone"));
            self.$el.find("#gender").text(self.model.get("gender"));


        }

    });

});
