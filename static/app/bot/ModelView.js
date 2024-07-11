define(function (require) {
	"use strict";
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!./tpl/model.html'),
		schema = require('json!schema/BotSchema.json');

	var SideMenuView = require("app/bot/SideMenuView");

	var StructureModelView = require("app/bot/StructureModelView");
	var SetupAIView = require("app/setup_ai/SetupAIView");
	var PersistentMenuView = require("app/persistent_menu/ModelView");
	var ConfigurationModelView = require("app/bot/ConfigurationModelView");
	var BroadcastView = require("app/broadcast/BroadcastView");
	var ContactCollectionView = require("app/contact/ContactCollectionView");
	var GrowCollectionView = require("app/grows/GrowCollectionView");
	var SettingView = require("app/setting/SettingView");
	var StatisticView = require("app/statistic/StatisticView");
	var LiveChatView = require("app/livechat/ModelView");

	var botViewMap = {
		"structure": StructureModelView,
		"ai-setup": SetupAIView,
		"livechat": LiveChatView,
		"persistentmenu": PersistentMenuView,
		"configuration": ConfigurationModelView,
		"broadcast": BroadcastView,
		"contact": ContactCollectionView,
		"grow": GrowCollectionView,
		"setting": SettingView,
		"statistic": StatisticView
	}

	return Gonrin.ModelView.extend({
		//modelIdAttribute: "_id",
		bindings: "data-bot-bind",
		template: template,
		modelSchema: schema,
		urlPrefix: "/api/v1/",
		collectionName: "bot",
		
		render: function () {
			var self = this;
			var sidemenu = new SideMenuView({
				el: self.$el.find("#bot-side-menu")
			});
			sidemenu.render();

			var id = this.getApp().getRouter().getParam("id");
			if (id) {
				this.model.set('_id', id);
				this.model.fetch({
					success: function (data) {
						var bot_info = data.toJSON();
						self.getApp().page_id = lodash.get(bot_info, 'page_id', null);
						var witToken = lodash.get(bot_info, 'wit.token', null);
						self.getApp().wit_token = witToken;
						//self.applyBindings();
						var attributes = self.model.get("user_define_attribute");
						attributes = ['tenant_id', 'page_id', 'page_name', 'name', 'first_name', 'last_name', 'gender', 'phone', 'booking_flag', 'booking_for_people_number', 'booking_time', 'booking_requirements', 'profile_pic', 'locale', 'timezone'].concat(attributes);

						self.getApp().data("attributes", attributes);
						// console.log('attributes: ', self.getApp().data("attributes"));
						self.getApp().data("current_bot", self.model.toJSON());
						self.getApp().data("bot_id", self.model.get("_id"));
						self.renderBotView();
						
						self.$el.find("#bot_name").change(function ($event) {
							var name = $(this).val();
							if (name === null || name === undefined || name === "") {
								self.getApp().notify("Không được bỏ trống tên của Bot", "danger");
								loader.error();
								return;
							}
							self.changeBotName(name, self.model.get("_id"));
						});
						self.renderBotInfoToHeader();
						self.applyBindings();
					},
					error: function () {
						loader.error();
						self.getApp().router.navigate("index");
					},
				});

			} else {
				self.getApp().router.navigate("index");
			}
		},

		renderBotInfoToHeader: function () {
			const self = this;
			$("#page-info-space").removeClass("hide");

			var page_logo = self.model.get("page_logo");
			if (!page_logo) {
				page_logo = self.model.get("page_profile_pic") ? self.model.get("page_profile_pic") : "https://static.upgo.vn/images/default-bot-icon.png";
			}
			$("#page-info-space").find("img.page-image").attr({
				"src": page_logo
			});
			$("#page-info-space").find("#page-name").html(self.model.get("page_name") ? self.model.get("page_name") : "&nbsp");
			$("#page-info-space").find("#_back").unbind("click").bind("click", (event) => {
				$("#page-info-space").addClass("hide");
				self.getApp().page_id = null;
				self.getApp().getRouter().navigate("index");
			});
		},

		renderBotView: function () {
			var self = this;
			var id = this.getApp().getRouter().getParam("id");
			var action = this.getApp().getRouter().getParam("action") || "structure";

			var View = botViewMap[action];
			if (View) {
				var view = new View({
					el: self.$el.find("#bot-container"),
				});
				view.render();
			}
		},
		changeBotName: function (name, bot_id) {
			var self = this;
			loader.show();
			$.ajax({
				url: self.getApp().serviceURL + "/api/v1/bot/update/attrs",
				type: "POST",
				data: JSON.stringify({
					"_id": bot_id,
					"name": name
				}),
				contentType: "application/json",
				dataType: 'json',
				success: function (response) {
					loader.saved();
				},
				error: function (error) {
					loader.error();
				}
			});
		}

	});

});