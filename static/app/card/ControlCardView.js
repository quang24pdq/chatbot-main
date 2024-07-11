define(function (require) {
	"use strict";
	var self = this;
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!./tpl/tool-card.html');
	var url_service = gonrinApp().serviceURL;

	var CardTextModelView = require("app/card/TextModelView");
	//	var GotoblockCardModelView = require("app/Card/GotoblockModelView");
	//	var ContactInputModelView = require("app/Card/ContactInputModelView");
	//	var JsonAPIModelView = require("app/Card/JsonAPIModelView");
	//	var RefLinkView = require("app/RefLink/RefSettingView");
	var ImageView = require("app/card/ImageModelView");
	//	var EmailView = require("app/Card/EmailModelView");
	var TypingModelView = require("app/card/TypingModelView");
	//	var SetUserAttributeModelView = require("app/Card/SetUserAttributeModelView");


	var cardViewMap = {
		"text": CardTextModelView,
		"typing": TypingModelView,
		//		"gotoblock": GotoblockCardModelView,
		//		"contactinput": ContactInputModelView,
		//		"jsonapi": JsonAPIModelView,
		"image": ImageView,
		//		"set_user_attribute":SetUserAttributeModelView,
		//		"email": EmailView
	};

	return Gonrin.ModelView.extend({
		modelIdAttribute: "_id",
		template: template,
		modelSchema: {},
		urlPrefix: "/api/v1/",
		collectionName: "card",
		uiControl: {
		},
		render: function () {
			var self = this;
			//			self.register_event();
			self.applyBindings();
			return this;
		},
		register_event: function (bot_id, block_id) {
			var self = this;
			self.$el.find("#create_card_text").unbind("click").bind("click", function () {
				var cardType = $(this).attr("data-card-type");
				if ((!!cardType) && (cardType.length > 0) && (!!block_id) && (block_id.length > 0)) {
					self.createCard(block_id, cardType);
				}

			});
			//			self.$el.find("#create_card_gotoblock").unbind("click").bind("click", function () {
			//				var cardType = $(this).attr("data-card-type");
			//				if ((!!cardType) && (cardType.length > 0) && (!!block_id) && (block_id.length > 0)) {
			//					self.createCard(block_id, cardType);
			//				}
			//			});
			//
			//			self.$el.find("#create_card_contactinput").unbind("click").bind("click", function () {
			//				var cardType = $(this).attr("data-card-type");
			//				if ((!!cardType) && (cardType.length > 0) && (!!block_id) && (block_id.length > 0)) {
			//					self.createCard(block_id, cardType);
			//				}
			//			});
			//			
			//			self.$el.find("#create_card_userattribute").unbind("click").bind("click", function () {
			//				var cardType = $(this).attr("data-card-type");
			//				if ((!!cardType) && (cardType.length > 0) && (!!block_id) && (block_id.length > 0)) {
			//					self.createCard(block_id, cardType);
			//				}
			//			});
			//
			//			self.$el.find("#create_card_jsonapi").unbind("click").bind("click", function () {
			//				var cardType = $(this).attr("data-card-type");
			//				if ((!!cardType) && (cardType.length > 0) && (!!block_id) && (block_id.length > 0)) {
			//					self.createCard(block_id, cardType);
			//				}
			//			});

			self.$el.find("#create_card_image").unbind("click").bind("click", function () {
				var cardType = $(this).attr("data-card-type");
				if ((!!cardType) && (cardType.length > 0) && (!!block_id) && (block_id.length > 0)) {
					self.createCard(block_id, cardType);
				}
			});

			//			self.$el.find("#create_card_email").unbind("click").bind("click", function () {
			//				var cardType = $(this).attr("data-card-type");
			//				if ((!!cardType) && (cardType.length > 0) && (!!block_id) && (block_id.length > 0)) {
			//					self.createCard(block_id, cardType);
			//				}
			//			});

			self.$el.find("#create_card_typing").unbind("click").bind("click", function () {
				var cardType = $(this).attr("data-card-type");
				if ((!!cardType) && (cardType.length > 0) && (!!block_id) && (block_id.length > 0)) {
					self.createCard(block_id, cardType);
				}
			});
		},
		createCard: function (block_id, cardType) {
			var self = this;
			var bot_id = this.getApp().getRouter().getParam("id");
			//var cardType = data["type"];
			var View = cardViewMap[cardType];

			if (View != null) {
				var view = new View();
				view.model.set("type", cardType);
				view.model.set("bot_id", bot_id);
				view.model.set("block_id", block_id);
				view.model.set("position", 1);

				loader.show();
				view.model.save(null, {
					success: function (model, respose, options) {
						self.renderCard(model.toJSON(), block_id);
						loader.saved();
					},
					error: function (model, xhr, options) {
						loader.error();
					}
				});
			}

		},
		renderCard: function (data, block_id) {
			var self = this;
			var cardType = data["type"];
			var View = cardViewMap[cardType];

			if (View != null) {
				var view = new View();
				view.model.set(data);
				view.render();
				$("#cards-container").append(view.$el);

				view.model.on("change", function () {
					loader.show();
					view.model.save(null, {
						success: function (model, respose, options) {
							loader.saved();
						},
						error: function (model, xhr, options) {
							loader.error();
						}
					});
				});

				view.on("delete_card", function (data) {
					loader.show();
					view.model.destroy({
						success: function (model, response) {
							loader.saved();
						},
						error: function (model, xhr, options) {
							loader.error();
						}
					});
				});
			}
		},

	});

});