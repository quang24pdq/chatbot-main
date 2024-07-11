define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');
    var template = require('text!./tpl/model.html'),
        schema = require('json!schema/ContactSchema.json');

    return Gonrin.ModelView.extend({
        //bindings: "card-text-bind",
        template: null,
        modelSchema: schema,
        urlPrefix: "/api/v1/",
        collectionName: "contact",

        render: function () {
            var self = this;
            var translatedTemplate = gonrin.template(template)(LANG);
            self.$el.html(translatedTemplate);
            self.applyBindings();
        }
    });

});