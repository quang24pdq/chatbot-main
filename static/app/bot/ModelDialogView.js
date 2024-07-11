define(function (require) {
	"use strict";
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!./tpl/model.html'),
		schema = require('json!schema/BotSchema.json');

	return Gonrin.ModelDialogView.extend({
		template: template,
		modelSchema: schema,
		urlPrefix: "/api/v1/",
		collectionName: "bot",
		tools: [
			{
				name: "save",
				type: "button",
				buttonClass: "btn btn-success btn-sm margin-2",
				label: "TRANSLATE:SAVE",
				command: function () {
					var self = this;
					loader.show();
					self.model.save(null, {
						success: function (model, response, options) {
							//self.getApp().nav.render();
							self.trigger("onCreated");
							self.close();
							loader.saved();
						},
						error: function (model, xhr, options) {
							loader.error();
						}
					});
				}
			}
		],
		render: function () {
			var self = this;
			self.applyBindings();

		},
	});

});
