define(function (require) {
	"use strict";
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');
	var template = require('text!./tpl/message-type.html');

	return Gonrin.ModelDialogView.extend({
		template: '',
		modelSchema: {},
		urlPrefix: "/api/v1/",
		collectionName: "message",
		render: function () {
			const self = this;
			var translatedTemplate = gonrin.template(template)(LANG);
			self.$el.html(translatedTemplate);
			this.applyBindings();
			return this;
		},
	});

});