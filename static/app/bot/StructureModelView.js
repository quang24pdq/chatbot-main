define(function (require) {
	"use strict";
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!./tpl/structure.html'),
		schema = require('json!schema/BotSchema.json'),
		groupsSchema = require('json!schema/GroupSchema.json'),
		blockSchema = require('json!schema/BlockSchema.json');

	var GroupModelView = require("app/group/ModelView");
	var BlockModelView = require("app/block/ModelView");
	var GenericCardView = require("app/card/GenericCardView");
	var CardTextModelView = require("app/card/TextModelView");
	var GotoblockCardModelView = require("app/card/GotoblockModelView");
	var ContactInputModelView = require("app/card/ContactInputModelView");
	var JsonAPIModelView = require("app/card/JsonAPIModelView");
	var RefLinkView = require("app/reflink/RefSettingView");
	var ImageView = require("app/card/ImageModelView");
	var EmailView = require("app/card/EmailModelView");
	var TypingModelView = require("app/card/TypingModelView");
	var SetUserAttributeModelView = require("app/card/SetUserAttributeModelView");
	var QuickReplyModelView = require("app/card/QuickReplyModelView");

	var cardViewMap = {
		"generic": GenericCardView,
		"text": CardTextModelView,
		"typing": TypingModelView,
		"gotoblock": GotoblockCardModelView,
		"contactinput": ContactInputModelView,
		"jsonapi": JsonAPIModelView,
		"image": ImageView,
		"set_user_attribute": SetUserAttributeModelView,
		"email": EmailView,
		"quickreply": QuickReplyModelView
	};

	return Gonrin.ModelView.extend({
		modelIdAttribute: "_id",
		botInfo: null,
		template: "",
		modelSchema: schema,
		urlPrefix: "/api/v1/",
		collectionName: "bot",
		initBlock: null,

		render: function () {
			var self = this;
			var translatedTemplate = gonrin.template(template)(LANG);
			self.$el.empty();
			self.$el.append(translatedTemplate);
			self.registerEvents();
			self.fetchGroups();
		},
		registerEvents: function () {
			var self = this;
			self.$el.find("#create_groups").unbind("click").bind("click", function () {
				self.createGroup();
			});

			self.getApp().off("create_block").on("create_block", function (group_id, group_type) {
				self.createBlock(group_id, group_type);
			});
			self.$el.find("#create_generic_card").unbind("click").bind("click", function () {
				var block_id = self.$el.find("#cards-tool").attr("data-block-id")
				var cardType = $(this).attr("data-card-type");
				if ((!!cardType) && (cardType.length > 0) && (!!block_id) && (block_id.length > 0)) {
					self.createCard(block_id, cardType);
				}

			});

			self.$el.find("#create_card_text").unbind("click").bind("click", function () {
				var bot_id = self.getApp().getRouter().getParam("id");
				var block_id = self.$el.find("#cards-tool").attr("data-block-id")
				var cardType = $(this).attr("data-card-type");
				if ((!!cardType) && (cardType.length > 0) && (!!block_id) && (block_id.length > 0)) {
					self.createCard(block_id, cardType);
				}

			});
			self.$el.find("#create_card_gotoblock").unbind("click").bind("click", function () {
				var bot_id = self.getApp().getRouter().getParam("id");
				var block_id = self.$el.find("#cards-tool").attr("data-block-id")
				var cardType = $(this).attr("data-card-type");
				if ((!!cardType) && (cardType.length > 0) && (!!block_id) && (block_id.length > 0)) {
					self.createCard(block_id, cardType);
				}
			});

			self.$el.find("#create_card_contactinput").unbind("click").bind("click", function () {
				var bot_id = self.getApp().getRouter().getParam("id");
				var block_id = self.$el.find("#cards-tool").attr("data-block-id")
				var cardType = $(this).attr("data-card-type");
				if ((!!cardType) && (cardType.length > 0) && (!!block_id) && (block_id.length > 0)) {
					self.createCard(block_id, cardType);
				}
			});

			self.$el.find("#create_card_userattribute").unbind("click").bind("click", function () {
				var bot_id = self.getApp().getRouter().getParam("id");
				var block_id = self.$el.find("#cards-tool").attr("data-block-id")
				var cardType = $(this).attr("data-card-type");
				if ((!!cardType) && (cardType.length > 0) && (!!block_id) && (block_id.length > 0)) {
					self.createCard(block_id, cardType);
				}
			});

			self.$el.find("#create_card_jsonapi").unbind("click").bind("click", function () {
				var bot_id = self.getApp().getRouter().getParam("id");
				var block_id = self.$el.find("#cards-tool").attr("data-block-id")
				var cardType = $(this).attr("data-card-type");
				if ((!!cardType) && (cardType.length > 0) && (!!block_id) && (block_id.length > 0)) {
					self.createCard(block_id, cardType);
				}
			});

			self.$el.find("#create_card_image").unbind("click").bind("click", function () {
				var bot_id = self.getApp().getRouter().getParam("id");
				var block_id = self.$el.find("#cards-tool").attr("data-block-id")
				var cardType = $(this).attr("data-card-type");
				if ((!!cardType) && (cardType.length > 0) && (!!block_id) && (block_id.length > 0)) {
					self.createCard(block_id, cardType);
				}
			});

			self.$el.find("#create_card_email").unbind("click").bind("click", function () {
				var bot_id = self.getApp().getRouter().getParam("id");
				var block_id = self.$el.find("#cards-tool").attr("data-block-id")
				var cardType = $(this).attr("data-card-type");
				if ((!!cardType) && (cardType.length > 0) && (!!block_id) && (block_id.length > 0)) {
					self.createCard(block_id, cardType);
				}
			});

			self.$el.find("#create_card_typing").unbind("click").bind("click", function () {
				var bot_id = self.getApp().getRouter().getParam("id");
				var block_id = self.$el.find("#cards-tool").attr("data-block-id")
				var cardType = $(this).attr("data-card-type");
				if ((!!cardType) && (cardType.length > 0) && (!!block_id) && (block_id.length > 0)) {
					self.createCard(block_id, cardType);
				}
			});
			self.$el.find("#create_card_quickreply").unbind("click").bind("click", function () {
				var bot_id = self.getApp().getRouter().getParam("id");
				var block_id = self.$el.find("#cards-tool").attr("data-block-id")
				var cardType = $(this).attr("data-card-type");
				if ((!!cardType) && (cardType.length > 0) && (!!block_id) && (block_id.length > 0)) {
					self.createCard(block_id, cardType);
				}
			});

			self.$el.find("#delete_block").unbind("click").bind("click", function () {
				var block_id = $("#cards-tool").attr("data-block-id");
				self.deleteBlock(block_id);
			});

			$("#block-tool").change(function ($event) {
				var name = $(this).val();
				var block_id = $("#cards-tool").attr("data-block-id");
				self.changeBlockName(name, block_id);
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
						loader.saved();
						self.renderCard(model.toJSON(), block_id, 0);
					},
					error: function (model, xhr, options) {
						loader.error();
					}
				});
			}

		},


		createBlock: function (group_id, group_type) {
			var self = this;
			var bot_id = this.getApp().getRouter().getParam("id");
			var view = new BlockModelView();
			view.model.set("name", gonrinApp().translate(LANG.CREATE_NEW_BLOCK));
			//view.model.set("type", "group");
			view.model.set("bot_id", bot_id);
			view.model.set("group_id", group_id);
			view.model.set("position", 1);
			var ref_link = {
				"active": false,
				"param": null
			};
			view.model.set("ref_link", ref_link)
			loader.show();
			view.model.save(null, {
				success: function (model, respose, options) {
					self.renderBlock(model.toJSON());
					self.fetchCards(model.get("_id"), model.toJSON());
					loader.saved();
				},
				error: function (model, xhr, options) {
					loader.error();
				}
			});
		},

		createGroup: function () {
			var self = this;
			var bot_id = this.getApp().getRouter().getParam("id");
			var view = new GroupModelView();
			view.model.set("name", gonrinApp().translate(LANG.CREATE_NEW_GROUP));
			view.model.set("type", "group");
			view.model.set("bot_id", bot_id);
			loader.show();
			view.model.save(null, {
				success: function (model, respose, options) {
					loader.saved();
					self.renderGroup(model.toJSON());
				},
				error: function (model, xhr, options) {
					loader.error();
				}
			});
		},

		/**
		 * 
		 */
		fetchGroups: function () {

			var self = this;
			var bot_id = this.getApp().getRouter().getParam("id");
			//get app groups
			var url = self.getApp().serviceURL + "/api/v1/group";
			var filters = { bot_id: bot_id, type: "group" };
			loader.show();
			$.ajax({
				url: url,
				data: { q: JSON.stringify({
					// order_by: [{ field: "position", direction: "asc" }],
					filters: filters
				}) },
				method: "GET",
				contentType: "application/json",
				success: function (data) {
					var groupData = lodash.get(data, 'objects', []);
					self.renderGroups(groupData);
					loader.hide();
				},
				error: function (xhr, status, error) {
					loader.error($.parseJSON(xhr.responseText).error_message);
				},
			});
		},
		/**
		 * FETCH ALL BLOCKS OF BOT
		 * @param {*} group_id 
		 */
		fetchBlocks: function (group_id, isDefault=false) {
			var self = this;
			//get app groups
			var bot_id = this.getApp().getRouter().getParam("id");
			var url = self.getApp().serviceURL + "/api/v1/block";
			var filters = { bot_id: bot_id };
			if (group_id) {
				filters['group_id'] = group_id;
			}
			loader.show();
			$.ajax({
				url: url,
				data: { q: JSON.stringify({ filters: filters }) },
				method: "GET",
				contentType: "application/json",
				success: function (response) {
					var blockDatas = lodash.get(response, 'objects', []);
					blockDatas = lodash.orderBy(blockDatas, ['position'], ['asc']);
					blockDatas.forEach((block, index) => {
						self.renderBlock(block, isDefault);
					});
					loader.hide();
				},
				error: function (xhr, status, error) {
					loader.error();
				},
			});
		},

		/**
		 * 
		 * @param {*} block_id 
		 * @param {*} blockData 
		 */
		fetchCards: function (block_id, blockData) {
			var self = this;
			var bot_id = this.getApp().getRouter().getParam("id");
			self.$el.find("#cards-tool").attr("data-block-id", block_id);
			self.$el.find("#cards-container").empty();
			//reflink
			self.$el.find("#block-tool").val(blockData.name);
			self.renderRefLinkView(blockData);
			//get app card
			var url = self.getApp().serviceURL + "/api/v1/card";
			var filters = {
				bot_id: bot_id,
				block_id: block_id
			};
			var order_by = [
				{ "position": "asc" }
			];
			loader.show();
			$.ajax({
				url: url,
				data: { q: JSON.stringify({ filters: filters, order_by: order_by }) },
				method: "GET",
				contentType: "application/json",
				success: function (response) {

					var cards = lodash.get(response, "objects", []);
					cards.forEach((card, index) => {
						self.renderCard(card, block_id, index + 1);
					});

					self.$el.find("#card-area").show();
					self.getApp().trigger("block-render", block_id);
					//self.fetchBlocks(id);
					loader.saved();
				},
				error: function (xhr, status, error) {
					loader.error();
				},
			});

		},

		/**
		 * 
		 * @param {*} groupsData 
		 */
		renderGroups: function (groupsData) {
			var self = this;

			self.$el.find("#cards-container").empty();
			if (!groupsData) {
				return;
			}
			var groups = clone(groupsData);
			// var defaultGroups = groups.filter(group => group.default && group.default == true);
			// groups.forEach((item, index) => {
			// 	self.renderGroup(item, true);
			// });

			groups.forEach((item, index) => {
				if (item.default && item.default == true) {
					self.renderGroup(item, true);
				} else {
					self.renderGroup(item);
				}
			});
		},

		renderGroup: function (group, isDefault=false) {
			const self = this;
			var view = new GroupModelView();
			view.model.set(group);
			view.render();
			self.$el.find("#groups-container").append(view.el);

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

			view.on("delete_groups", function ($event) {
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

			self.fetchBlocks(group._id, isDefault);
		},


		/**
		 * 
		 * @param {*} blockData 
		 */
		renderBlock: function (blockData, isDefault) {
			var self = this;
			var blockData = clone(blockData);
			var view = new BlockModelView();
			view.model.set(blockData);
			view.render();

			var groupEl = self.$el.find("[data-group-id=" + blockData.group_id + "]");
			if (isDefault === true) {
				groupEl.find('.btn-create-block').remove();
			}
			if (!!groupEl) {
				groupEl.find("#blocks-container").append(view.$el.find('.button-block'));
			}

			if (!self.initBlock && blockData.default && blockData.default == true) {
				setTimeout(() => {
					view.$el.find(".block-name").trigger('click');
				}, 400);
				self.initBlock = true;
			}

			view.on("clone-block", function (model) {
				if (model) {
					$.ajax({
						url: self.getApp().serviceURL + "/api/v1/block/clone_block",
						data: JSON.stringify({
							"block_id": model._id,
							"bot_id": model.bot_id,
							"group_id": model.group_id
						}),
						method: "POST",
						contentType: "application/json",
						success: function (response) {
							self.renderBlock(response);
						},
						error: function (xhr, status, error) {
							console.log("error", error);
						},
					});

				}
			});

			view.on("delete-block", function (block_id) {
				self.deleteBlock(block_id);
			});

			view.on("delete_block", function ($event) {
				loader.show();
				view.model.destroy({
					success: function (model, response) {
						loader.saved();
						self.$el.find("#card-area").hide();
					},
					error: function (model, xhr, options) {
						console.log(xhr);
						var errorMsg = lodash.get(xhr, 'responseJSON.error_message', '');
						loader.error(errorMsg);
					}
				});
			});
			view.off("block-selected").on("block-selected", function (block_id) {
				self.fetchCards(block_id, blockData);
			});

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
		},

		/**
		 * 
		 * @param {*} cardData 
		 * @param {*} block_id 
		 */
		renderCard: function (cardData, block_id, position) {
			var self = this;
			var card = clone(cardData);
			var cardType = lodash.get(card, 'type', null);
			var View = cardViewMap[cardType];

			if (View) {
				var view = new View({
					viewData: clone({
						"position": position
					})
				});
				view.model.set(card);
				view.render();
				$(view.el).appendTo(self.$el.find("#cards-container")).fadeIn();
				// self.$el.find("#cards-container").append(view.el);

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

				view.on("change_card_position", function (event) {
					self.changeCardPosition(event, block_id);
				});
			}

		},
		changeCardPosition: function (event, block_id) {
			var self = this;
			var url = self.getApp().serviceURL + "/api/v1/card/change_position";
			var param = {
				block_id: block_id,
				card_id: event.data._id,
				action: event.action
			};
			loader.show();
			$.ajax({
				url: url,
				data: JSON.stringify(param),
				method: "POST",
				contentType: "application/json",
				success: function (blockData) {
					self.fetchCards(block_id, blockData);
					loader.saved();
				},
				error: function (xhr, status, error) {
					loader.error();
				},
			});

		},

		changeBlockName: function (name, block_id) {
			var self = this;
			// var block = $("div[block-id='block_id']")
			var block = $('div[block-id="' + block_id + '"]');
			var el = block.find(".block-name");
			if (name == "")
				name = "Undefined";

			el.text(name).attr("title", name);
			self.$el.find("#block-tool").val(name);

			loader.show();
			$.ajax({
				url: self.getApp().serviceURL + "/api/v1/block/get",
				type: "GET",
				data: "id=" + block_id + "&" + "name=" + name,
				contentType: "application/json",
				dataType: 'json',
				success: function (response) {
					loader.saved();
				},
				error: function (error) {
					loader.error();
				}
			});
		},

		deleteBlock: function (block_id) {
			var self = this;
			var data = JSON.stringify({
				block_id: block_id,
			});
			loader.show();
			$.ajax({
				url: self.getApp().serviceURL + "/api/v1/block/" + block_id,
				type: "DELETE",
				contentType: "application/json",
				dataType: 'json',
				data: data,
				success: function (response) {
					loader.saved();
					self.$el.find("#cards-container").empty();
					self.$el.find("#block-tool").val("");
					var block = $('div[block-id="' + block_id + '"]');
					self.$el.find("#card-area").hide();
					block.remove();
				},
				error: function (xhr) {
					console.log("xhr ", xhr);
					var errorMsg = lodash.get(xhr, 'responseJSON.error_message', '');
					loader.error(errorMsg);
				}
			});
		},

		renderRefLinkView: function (blockModelData) {
			var self = this;
			if (blockModelData) {
				if (blockModelData.ref_link && blockModelData.ref_link.active == true) {
					self.$el.find("#reference-link").addClass("ref-active");
				} else {
					if (self.$el.find("#reference-link").hasClass("ref-active")) {
						self.$el.find("#reference-link").removeClass("ref-active");
					}
				}
				self.$el.find("#reference-link").unbind("click").bind("click", function ($event) {
					var refLinkView = new RefLinkView({
						viewData: blockModelData.ref_link
					});
					refLinkView.botInfo = self.botInfo;
					refLinkView.dialog();
					refLinkView.on("save", function (data) {
						loader.show();
						$.ajax({
							url: self.getApp().serviceURL + "/api/v1/block/update/attrs",
							data: JSON.stringify({
								_id: blockModelData._id,
								ref_link: data
							}),
							type: "PUT",
							success: function (response) {
								blockModelData.ref_link = data;
								if (blockModelData.ref_link && blockModelData.ref_link.active == true) {
									self.$el.find("#reference-link").addClass("ref-active");
								} else {
									if (self.$el.find("#reference-link").hasClass("ref-active")) {
										self.$el.find("#reference-link").removeClass("ref-active");
									}
								}
								loader.saved();
							},
							error: function () {
								loader.error();
							}
						})
					});
				});
			}
		}

	});

});
