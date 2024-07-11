define(function (require) {
    "use strict";
    var self = this;
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');

    var template = require('text!./tpl/form-view.html');

    return Gonrin.View.extend({
        template: template,
        urlPrefix: "/api/v1/",
        collectionName: "webform",
        uiControl: {},

        render: function () {
            var self = this;
            var translatedTemplate = gonrin.template(template)(LANG);
            self.$el.html(translatedTemplate);
            self.applyBindings();
        }
    })
})
