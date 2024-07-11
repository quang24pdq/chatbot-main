define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');
    var template = require('text!./tpl/setting.html');
    var schema = {};
    
    return Gonrin.ModelView.extend({
        bindings: "setting-bind",
        template: null,
        modelSchema: schema,
        urlPrefix: "/api/v1/",
        collectionName: "bot",

        render: function () {
            var self = this;
            var translatedTemplate = gonrin.template(template)(LANG);
			self.$el.html(translatedTemplate);
            var bot_id = this.getApp().getRouter().getParam("id");
        },
        registerEvents: function () {
            var self = this;
        },
    });

});