define(function (require) {
	"use strict";
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');
    var template = require('text!./tpl/setting.html');

	return Gonrin.View.extend({
		template: '',
		render: function () {
			const self = this;
			var translatedTemplate = gonrin.template(template)(LANG);
            self.$el.html(translatedTemplate);
            
			return this;
		}
	});
});