define(function (require) {
	"use strict";
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!./tpl/model.html'),
		schema = require('json!schema/BroadcastSchema.json');
	var ConditionModelView = require('app/condition/ConditionModelView');

	var GenericCardView = require("app/card/GenericCardView");
	var CardTextModelView = require("app/card/TextModelView");
	var ImageView = require("app/card/ImageModelView");
	var TypingModelView = require("app/card/TypingModelView");

	var cardViewMap = {
		"generic": GenericCardView,
		"text": CardTextModelView,
		"typing": TypingModelView,
		"image": ImageView,
	};

	return Gonrin.ModelView.extend({
		modelIdAttribute: "_id",
		template: '',
		modelSchema: schema,
		urlPrefix: "/api/v1/",
		collectionName: "broadcast",
		render: function () {
			var self = this;
			var translatedTemplate = gonrin.template(template)(LANG);
			self.$el.html(translatedTemplate);
			
			if (self.model.get("_id")) {
				self.model.fetch({
					success: function (data) {
						self.applyBindings();
						self.loadData();
						self.registerEvents();
					},
					error: function(xhr) {
						console.log('error');
					}
				});
			} else {
				self.model.set('name', 'Send Now');
				self.model.set('type', 'subscription');
				self.model.set('conditions', {});
				self.model.save(null, {
					success: function(data) {
						self.model.set(data);
						self.applyBindings();
						self.loadData();
						self.registerEvents();
					},
					error: function(xhr) {
						console.log("error: ", xhr);
					}
				});
			}
		},

		loadData: function() {
			const self = this;
			// this.$el.find("#broadcast-name").val(self.model.get("name"));
			if (!self.model.get('sent_time')) {
				self.$el.find(".broadcast-overlay").addClass("hide");
			}
			var conditions = self.model.get("conditions");
			var orOperator = lodash.get(conditions, '$or', []);
			var andOperator = lodash.get(conditions, '$and', []);
			if (orOperator.length > 0 ) {
				orOperator.forEach((condition, index) => {
					var conditionView = new ConditionModelView();
					conditionView.model.set(condition);
					conditionView.render();
					this.$el.find("#filter-card").html(conditionView.el);
				});
			} else if (andOperator.length > 0) {
				andOperator.forEach((condition, index) => {
					var conditionView = new ConditionModelView();
					conditionView.model.set(condition);
					conditionView.render();
					this.$el.find("#filter-card").html(conditionView.el);
				});
			}
			self.renderCards();
		},

		registerEvents: function() {
			const self = this;
			var botId = this.getApp().getRouter().getParam("id");
			var broadcastId = self.model.get('_id');

			this.model.on("change:name", () => {
				loader.show();
				self.model.save(null, {
					success: function(data) {
						loader.saved();
					},
					error: function(xhr) {
						loader.error('Không thể sửa sau khi broadcast.');
					}
				});
			});

			this.$el.find("#send").unbind("click").bind("click", () => {
				self.$el.find("#send").prop('disabled', true);
				self.$el.find(".broadcast-overlay").addClass("hide");
				if (!self.model.get('sent_time')) {
					var broadcastServiceURL = self.getApp().serviceURL + '/api/v1/broadcast/subscription';
					loader.show();
					$.ajax({
						url: broadcastServiceURL,
						data: JSON.stringify({'bot_id': botId, 'broadcast_id': broadcastId}),
						type: "POST",
						success: function(response) {
							loader.saved();
						},
						error: function(xhr) {
							loader.error();
						}
					});
				}
			});

			this.registerCardEvents();
		},

		registerCardEvents: function() {
			const self = this;
			var botId = this.getApp().getRouter().getParam("id");
			var broadcastId = self.model.get('_id');
			var cardEls = this.$el.find("#cards li a");
			$.each(cardEls, (index, element) => {
				$(element).unbind("click").bind("click", (event) => {
					if (!self.model.get("sent_time") && self.$el.find("#cards-container .container-hover").length <= 0) {
						var key = $(element).attr('data-card-type');
						var cardData = {
							'type': key,
							'position': null,
							'broadcast_id': broadcastId,
							'bot_id': botId,
						};
						self.saveCard(cardData, (response) => {
							self.renderCard(key, response);
						});
					}
				});
			});
		},

		renderCards: function(cards) {
			const self = this;
			var botId = this.getApp().getRouter().getParam("id");
			// GET ALL CARDS
			self.$el.find("#cards-container").empty();
			loader.show();
			$.ajax({
				url: self.getApp().serviceURL + '/api/v1/card',
				data: {q: JSON.stringify({filters: {'bot_id': botId, 'broadcast_id': self.model.get('_id')}})},
				type: "GET",
				success: function(response) {
					loader.hide();
					var cards = lodash.get(response, 'objects', []);
					cards.forEach((card, index) => {
						self.renderCard(card.type, card);
					});
				},
				error: function(xhr) {
					loader.error();
				}
			});

		},

		renderCard: function(key, modelData) {
			const self = this;
			var View = cardViewMap[key];
			if (View) {
				var cardView = new View();
				cardView.model.set(modelData);
				cardView.render();
				self.$el.find("#cards-container").append(cardView.el);
				cardView.on("change", (viewModelData) => {
					self.saveCard(viewModelData);
				});

				cardView.on("delete_card", function (data) {
					if (!self.model.get("sent_time")) {
						cardView.destroy();
						loader.show();
						cardView.model.destroy({
							success: function (model, response) {
								loader.saved();
							},
							error: function (model, xhr, options) {
								loader.error();
							}
						});
					}
				});
			}
		},

		saveCard: function(card, callback) {
			var url = this.getApp().serviceURL + '/api/v1/card';
			var method = "POST";
			if (card._id) {
				method = "PUT";
				url = url + "/" + card._id
			}
			loader.show();
			$.ajax({
				url: url,
				data: JSON.stringify(card),
				type: method,
				success: function(response) {
					loader.saved();
					if (callback) {
						callback(response);
					}
				},
				error: function(xhr) {
					loader.error();
				}
			})
		}
	});

});