define(function (require) {
	"use strict";
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!./tpl/index.html');
	var bot_template = require('text!./tpl/bot_template.html');
	var FacebookSDK = require('app/common/FacebookSDK');
	var BotDialogView = require('app/bot/ModelDialogView');
	var Helper = require('app/common/Helpers');

	return Gonrin.View.extend({
		template: "",
		urlPrefix: "/api/v1/",
		collectionName: "index",
		tools: [],
		render: function () {
			var self = this;
			var tpl = gonrin.template(template)(LANG);
			self.$el.empty();
			self.$el.append(tpl);
			if (!$("#page-info-space").hasClass("hide")) {
				$("#page-info-space").addClass("hide");
			}
			this.$el.find("copyright .version").html(this.getApp().version);

			self.applyBindings();
			self.fetchBots();
			self.registerEvents();
			self.getApp().setCurrentTenant();

			// FB.CustomerChat.show(true);

			return this;
		},
		fetchBots: function () {
			var self = this;
			loader.show();
			$.ajax({
				url: self.getApp().serviceURL + "/api/v1/bot",
				data: { q: JSON.stringify({ filters: { active: true } }) },
				method: "GET",
				contentType: "application/json",
				success: function (data) {
					loader.saved();
					self.renderBots(data.objects);
				},
				error: function (xhr, status, error) {
					loader.error();
					self.renderBots([]);
				},
			});
		},
		renderBots: function (data) {
			var self = this;
			const botContainerEl = self.$el.find("#bots-container");
			botContainerEl.empty();

			$(`<div class="col-lg-3 col-md-3 col-sm-4 col-xs-12 bot-list-item" id="create-bot">
				<div class="bot-tile" style="background-color: #0095ff; color: #fff; position: relative;">
					<i class="fas fa-plus" style="position: absolute; top: calc(50% - 20px); left: calc(50% - 13px); font-size: 26px;"></i>
					<div style="position: absolute; top: calc(50% + 15px); width: 100%; text-align: center; left: 0px;">${LANG.CREATE_NEW_BOT}</div>
				</div>
			</div>`).appendTo(botContainerEl).fadeIn();
			self.$el.find("#create-bot").unbind("click").bind("click", function () {
				self.getApp().getRouter().navigate('template/choose');
				self.getApp().on("create_blank_bot", () => {
					self.createBot();
				});
			});

			$.each(data, function (idx, obj) {
				if (!!obj) {
					Helper.objectExtend(obj, LANG);
					var subscribed = lodash.get(obj, 'subscribed', false);
					var connectionStatus = "";
					if (subscribed == true) {
						// obj.CONNECTED_TO = LANG.CONNECTED_TO;
						connectionStatus += "<div class='ellipsis-300'>";
						connectionStatus += LANG.CONNECTED_TO;
						if (!obj.page_name) {
							connectionStatus = connectionStatus + " " + LANG.BLANK_BOT;
						} else {
							connectionStatus = connectionStatus + " " + obj.page_name;
						}
						connectionStatus += "</div>";
						connectionStatus += "<p id='figures'><frequence>{{PAGE_FREQUENCE_ACTIVE}}:</frequence><like>0</like> {{PAGE_LIKE}}<reachable>0</reachable> {{PAGE_REACHABLE}}</p>";
						connectionStatus = gonrin.template(connectionStatus)(LANG);
					} else {
						connectionStatus += `<button class="btn btn-default btn-sm" id="btn-connect" style="margin-left:calc(50% - 40px); border-radius:15px; padding:5px 15px;font-size:13px;z-index:1;">${LANG.CONNECT}</button>`;
					}
					
					if (obj.page_profile_pic === undefined || obj.page_profile_pic === null || obj.page_profile_pic === "") {
						obj.page_profile_pic = 'https://static.upgo.vn/images/default-bot-icon.png';
					}
					if (obj.page_logo) {
						obj.page_profile_pic = obj.page_logo;
					}

					obj.CONNECTION_STATUS = connectionStatus;
				}
				var tpl = gonrin.template(bot_template)(obj);
				self.$el.find("#bots-container").append(tpl);

				if (subscribed !== true) {
					self.$el.find("div [data-id=" + obj._id + "]").find(".bot-tile-image-container").css({ 'opacity': '0.4' });
				}


				if (obj.page_id) {
					$.ajax({
						url: self.getApp().serviceURL + "/api/v1/page/like/count?page_id=" + obj.page_id,
						type: "GET",
						success: function (response) {
							var figureEl = self.$el.find("div [data-id=" + obj._id + "]").find("like");
							figureEl.html(response.likes);
						}
					});
				}

				if (obj.page_id) {
					$.ajax({
						url: self.getApp().serviceURL + "/api/v1/page/reachable/count?page_id=" + obj.page_id,
						type: "GET",
						success: function (response) {
							var figureEl = self.$el.find("div [data-id=" + obj._id + "]").find("reachable");
							figureEl.html(response.reachables);
						}
					});
				}

				var connectBtn = self.$el.find("div [data-id=" + obj._id + "]").find("#btn-connect");
				var length = lodash(connectBtn, 'length', 0);
				if (length) {
					connectBtn.unbind("click").bind("click", function (event) {
						var url = "bot/model?id=" + obj._id + "&action=configuration";
						self.getApp().getRouter().navigate(url);
					});
				}
				self.registerBotOptions(obj);
			});


		},
		registerEvents: function () {
			var self = this;
		},

		registerBotOptions: function (obj) {
			var self = this;
			var botEl = self.$el.find("#bot_" + obj._id);

			botEl.find("#btn_options").unbind("click").bind("click", function (event) {
				self.registerToggles(obj._id);

				botEl.find("#options_dropdown").toggle("show");
				botEl.find("#clone_bot").unbind("click").bind("click", function () {
					var bot_id = obj._id;
					$.ajax({
						url: self.getApp().serviceURL + "/api/v1/bot/clone",
						type: "POST",
						contentType: "application/json",
						data: JSON.stringify({
							"bot_id": bot_id
						}),
						success: function (response) {
							if (response) {
								self.fetchBots();
							}
						},
						error: function (error) {
							console.log("error", error)
						}
					});
				});

				botEl.find("#delete_bot").unbind("click").bind("click", function () {
					var bot_id = obj._id;
					$.confirm({
						title: LANG.CONFIRM,
						content: LANG.CONFIRM_DELETE,
						theme: "modern",
						type: "blue",
						icon: 'fa fa-warning',
						animation: 'zoom',

						buttons: {
							DELETE: {
								btnClass: "btn-danger",
								action: function () {
									$.ajax({
										url: self.getApp().serviceURL + "/api/v1/bot/delete?id=" + bot_id + "&delete=hard",
										method: "DELETE",
										contentType: "application/json",
										success: function (data) {
											var botInfo = lodash.get(data, 'bot_info', null);
											if (botInfo && botInfo.page_id && botInfo.token) {
												var page = {
													"id": botInfo.page_id,
													"name": botInfo.page_name,
													"token": botInfo.token
												}

												FacebookSDK.unsubscribed(page);
											}
											self.fetchBots();
										},
										error: function (xhr, status, error) {
											var error_msg = lodash.get(xhr, 'responseJSON.error_message', '');
											self.getApp().notify({ message: error_msg }, { type: "danger" });
										},
									});
								}
							},
							CANCEL: function () {
							}
						}
					});
				});

				botEl.find("#rename_bot").unbind("click").bind("click", function () {
					var bot_id = obj._id;
					$.confirm({
						title: LANG.CONFIRM_RENAME,
						content: '<input type="text" class="form-control" id="rename" placeholder="' + LANG.RENAME_TO + '" />',
						theme: "modern",
						icon: 'fa fa-edit',
						animation: 'zoom',
						type: "blue",
						closeAnimation: 'scale',
						buttons: {
							OK: function () {
								var botName = $("#rename").val();
								$.ajax({
									url: self.getApp().serviceURL + "/api/v1/bot/rename",
									type: "POST",
									contentType: "application/json",
									data: JSON.stringify({
										"bot_id": bot_id,
										"bot_name": botName
									}),
									success: function (response) {
										if (response) {
											self.fetchBots();
										}
									},
									error: function (error) {
										console.log("error", error)
									}
								});

							},
							CANCEL: function () { }
						}
					});
				});

			});
		},

		//team
		createBot: function () {
			var self = this;
			var view = new BotDialogView();
			view.model.set("name", LANG.BLANK_BOT);
			view.model.save(null, {
				success: function (model, response, options) {
					view.trigger("onCreated");
					self.getApp().notify({ message: LANG.MESSAGE.BOT_NEW_CREATED }, { type: "success" });
				},
				error: function (model, xhr, options) {
					self.getApp().notify({ message: LANG.MESSAGE.ERROR }, { type: "danger" });
				}
			});

			view.on("onCreated", function () {
				self.fetchBots();
			});
		},

		registerToggles: function (botID) {
			const self = this;
			console.log("botID", botID);
			// $.ajax({
			// 	url: self.getApp().serviceURL + "/api/v1/bot/get_current_user",
			// 	method: "POST",
			// 	contentType: "application/json",
			// 	data: JSON.stringify({
			// 		"bot_id": botID
			// 	}),
			// 	success: function (respose) {
			// 		if (respose.message == "true") {
			// 			console.log(self.$el.find("#delete_bot_" + botID))
			// 			self.$el.find("#delete_bot_" + botID).css({"display": "none"});
			// 			self.$el.find("#rename_bot_" + botID).css({"display": "none"});
			// 		}
			// 	},
			// 	error: function (xhr, status, error) {
			// 		console.log("error", error);
			// 	},
			// });
		},
	});



});
