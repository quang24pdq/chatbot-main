define(function (require) {
	"use strict";
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!./tpl/broadcast-block.html'),
		schema = require('json!schema/BlockSchema.json');
	var BroadcastButtonTemplateView = require('app/broadcast/BroadcastButtonTemplateView');
	var BroadcastMediaTemplateView = require('app/broadcast/BroadcastMediaTemplateView');
	var BroadcastGenericTemplateView = require('app/broadcast/BroadcastGenericTView');

	return Gonrin.ModelView.extend({
		modelIdAttribute: "_id",
		template: "",
		modelSchema: schema,
		urlPrefix: "/api/v1/",
		collectionName: "block",
		uiControl: {},
		render: function () {
			var self = this;
			var translatedTemplate = gonrin.template(template)(LANG);
			self.$el.empty();
			self.$el.append(translatedTemplate);
			self.applyBindings();
			self.renderCards();
			this.$el.find(".dropdown-item-button-template").unbind('click').bind('click', () => {
				const bot_id = self.getApp().getRouter().getParam("id");
				const block_id = self.model.get("_id");
				const broadcast_id = self.model.get("broadcast_id");
				var cardData = {
					'type': 'button',
					'text': null,
					'buttons': [],
					'position': null,
					'block_id': block_id,
					'broadcast_id': broadcast_id,
					'bot_id': bot_id,
				};
				self.saveCard(cardData, (data) => {
					self.rendertButtonTemplate(data);
				});
			});
			const page_id = self.getApp().getRouter().getParam("page_id");
			self.model.set("page_id",page_id);

			this.$el.find(".dropdown-item-media-template").unbind('click').bind('click', () => {
				const bot_id = self.getApp().getRouter().getParam("id");
				const block_id = self.model.get("_id");
				const broadcast_id = self.model.get("broadcast_id");
				var cardData = {
					'type': 'media',
					'elements': [],
					'position': null,
					'block_id': block_id,
					'broadcast_id': broadcast_id,
					'bot_id': bot_id,
				};
				self.saveCard(cardData, (data) => {
					self.rendertMediaTemplate(data);
				});
			});

			this.$el.find(".dropdown-item-generic-template").unbind('click').bind('click', () => {
				const bot_id = self.getApp().getRouter().getParam("id");
				const block_id = self.model.get("_id");
				const broadcast_id = self.model.get("broadcast_id");
				var cardData = {
					'type': 'generic',
					'elements': [],
					'position': null,
					'block_id': block_id,
					'broadcast_id': broadcast_id,
					'bot_id': bot_id,
				};
				self.saveCard(cardData, (data) => {
					self.rendertGenericTemplate(data);
				});
			});

			this.$el.find(".btn_delete_block").unbind('click').bind('click', () => {
				$.confirm({
					title: LANG.CONFIRM,
					content: LANG.CONFIRM_DELETE,
					buttons: {
						Delete: {
							btnClass: "btn-danger",
							action: function () {
								var block_id = self.model.get('_id');
								spinner.show();
								$.ajax({
									url: self.getApp().serviceURL + "/api/v1/block/" + block_id,
									type: "DELETE",
									contentType: "application/json",
									dataType: 'json',
									data: JSON.stringify({
										'block_id': block_id
									}),
									success: function (response) {
										spinner.hide();
										self.remove();
									},
									error: function (xhr) {
										var errorMsg = lodash.get(xhr, 'responseJSON.error_message', '');
										spinner.error(errorMsg);
									}
								});
							}
						},
						Cancel: function () {
						}
					}
				});
			});
		},

		renderCards: function () {
			const self = this;
			const bot_id = this.getApp().getRouter().getParam("id");
			const block_id = this.model.get('_id');
			const broadcast_id = this.model.get('broadcast_id');
			$.ajax({
				"type": "GET",
				url: self.getApp().serviceURL + '/api/v1/card',
				data: { q: JSON.stringify({ filters: { 'bot_id': bot_id, 'broadcast_id': broadcast_id, 'block_id': block_id } }) },
				success: function (response) {
					const cards = lodash.get(response, 'objects', []);
					cards.forEach((card, index) => {
						if (card.type == 'button') {
							self.rendertButtonTemplate(card);
						}
						else if(card.type == 'media') {
							self.rendertMediaTemplate(card);
						}
						else if(card.type == 'generic'){
							self.rendertGenericTemplate(card);
						}
					});
				},
				error: function (xhr) { }
			});
		},

		rendertButtonTemplate: function (modelData) {
			const self = this;
			var cardContainerEl = self.$el.find('.broadcast-card-container');
			var buttonTemplate = new BroadcastButtonTemplateView();
			buttonTemplate.model.set(modelData);
			buttonTemplate.render();

			$(`<div class="col-lg-6 col-md-6 col-sm-6 col-12" id="${buttonTemplate.model.get('_id')}"></div>`).appendTo(cardContainerEl).fadeIn();
			$(buttonTemplate.el).appendTo(cardContainerEl.find("#" + buttonTemplate.model.get('_id'))).fadeIn();

			buttonTemplate.on('change', (data) => {
				self.saveCard(data);
			});
			buttonTemplate.on("delete_card", function (data) {
				spinner.show();
				buttonTemplate.model.destroy({
					success: function (model, response) {
						spinner.hide();
						buttonTemplate.destroy();
					},
					error: function (model, xhr, options) {
						spinner.hide();
					}
				});
			});
		},
		rendertMediaTemplate: function (modelData) {
			const self = this;
			var cardContainerEl = self.$el.find('.broadcast-card-container');
			var mediaTemplate = new BroadcastMediaTemplateView();
			mediaTemplate.model.set(modelData);
			mediaTemplate.render();

			$(`<div class="col-lg-6 col-md-6 col-sm-6 col-12" id="${mediaTemplate.model.get('_id')}"></div>`).appendTo(cardContainerEl).fadeIn();
			$(mediaTemplate.el).appendTo(cardContainerEl.find("#" + mediaTemplate.model.get('_id'))).fadeIn();

			mediaTemplate.on('change', (data) => {
				self.saveCard(data);
			});
			mediaTemplate.on("delete_card", function (data) {
				spinner.show();
				mediaTemplate.model.destroy({
					success: function (model, response) {
						spinner.hide();
						mediaTemplate.destroy();
					},
					error: function (model, xhr, options) {
						spinner.hide();
					}
				});
			});
		},
		rendertGenericTemplate: function (modelData) {
			const self = this;
			var cardContainerEl = self.$el.find('.broadcast-card-container');
			var genericTemplate = new BroadcastGenericTemplateView();
			genericTemplate.model.set(modelData);
			genericTemplate.render();

			$(`<div class="col-lg-6 col-md-6 col-sm-6 col-12" id="${genericTemplate.model.get('_id')}"></div>`).appendTo(cardContainerEl).fadeIn();
			$(genericTemplate.el).appendTo(cardContainerEl.find("#" + genericTemplate.model.get('_id'))).fadeIn();

			genericTemplate.on('change', (data) => {
				self.saveCard(data);
			});
			genericTemplate.on("delete_card", function (data) {
				spinner.show();
				genericTemplate.model.destroy({
					success: function (model, response) {
						spinner.hide();
						genericTemplate.destroy();
					},
					error: function (model, xhr, options) {
						spinner.hide();
					}
				});
			});
		},
		saveCard: function (card, callback) {
			var url = this.getApp().serviceURL + '/api/v1/card';
			var method = "POST";
			if (card._id) {
				method = "PUT";
				url = url + "/" + card._id
			}
			spinner.show();
			$.ajax({
				url: url,
				data: JSON.stringify(card),
				type: method,
				success: function (response) {
					spinner.hide();
					if (callback) {
						callback(response);
					}
				},
				error: function (xhr) {
					if (callback) {
						callback(null);
					}
					spinner.error();
				}
			})
		},
	});

});
