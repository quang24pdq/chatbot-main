define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');

    var template = require('text!./tpl/model.html');
    var LeftMenuView = require("app/livechat/LeftMenuView");
    var CenterMenuView = require("app/livechat/CenterMenuView");
    var RightMenuView = require("app/livechat/RightMenuView");

    return Gonrin.ModelView.extend({
        template: '',
        modelSchema: {},

        render: function () {
            var self = this;
            var translatedTemplate = gonrin.template(template)(LANG);
            self.$el.html(translatedTemplate);
            self.renderView();
        },

        renderView: function () {
            const self = this;
            var leftView = new LeftMenuView();
            var centerView = new CenterMenuView();
            var rightView = new RightMenuView();

            leftView.render();
            self.$el.find("#live-chat").append(leftView.el);
           

            leftView.off("change-item").on("change-item", function (data) {
                centerView.model.set(clone(data));
                centerView.render();
                self.$el.find("#live-chat").append(centerView.el);

                rightView.model.set(clone(data));
                rightView.render();
                self.$el.find("#live-chat").append(rightView.el);
            });
        },

    });

});
