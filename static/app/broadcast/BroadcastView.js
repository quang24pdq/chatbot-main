define(function (require) {
	"use strict";
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!./tpl/broadcast.html'),
		schema = require('json!schema/BotSchema.json'),
		groupsSchema = require('json!schema/GroupSchema.json'),
		blockSchema = require('json!schema/BlockSchema.json');

	var TemplateHelper = require('app/common/TemplateHelper');

	var GroupModelView = require("app/group/ModelView");
	var SendNowCollection = require('app/broadcast/sendnow/CollectionView');
	var SendNowModelView = require('app/broadcast/sendnow/ModelView');

	var SubscriptionCollection = require('app/broadcast/subscription/CollectionView');
	var SubscriptionModelView = require('app/broadcast/subscription/ModelView');

	var CardControlView = require('app/card/ControlCardView');


	return Gonrin.ModelView.extend({
		modelIdAttribute: "_id",
		botInfo: null,
		template: '',
		modelSchema: schema,
		urlPrefix: "/api/v1/",
		collectionName: "bot",
		defaultGroups: [
			{
				'name': 'DELIVER YOUR MESSAGE NOW',
				'type': 'broadcast',
				'broadcast_type': 'sendnow',
				'position': null,
				'default': true,
				'active': true
			},
			// {
			// 	'name': 'ADD A TRIGGER',
			// 	'type': 'broadcast',
			// 	'broadcast_type': 'trigger',
			// 	'position': null,
			// 	'default': true,
			// 	'active': true
			// },
			// {
			// 	'name': 'SCHEDULE FOR LATER',
			// 	'type': 'broadcast',
			// 	'broadcast_type': 'schedule',
			// 	'position': null,
			// 	'default': true,
			// 	'active': true
			// },
			// {
			// 	'name': 'SUBSCRIPTION MESSAGING',
			// 	'type': 'broadcast',
			// 	'broadcast_type': 'subscription',
			// 	'position': null,
			// 	'default': true,
			// 	'active': true
			// },
		],

		render: function () {
			var self = this;
			var translatedTemplate = gonrin.template(template)(LANG);
			self.$el.append(translatedTemplate);
			self.fetchGroups();
		},

		fetchGroups: function () {
			const self = this;
			var botId = this.getApp().getRouter().getParam("id");
			// CALL TO FETCH GROUP
			var filters = { bot_id: botId, type: "broadcast" };
			loader.show();
			$.ajax({
				url: self.getApp().serviceURL + '/api/v1/group',
				data: { 'q': JSON.stringify({ filters: filters }) },
				method: "GET",
				success: function (response) {
					loader.hide();
					var groups = lodash.get(response, 'objects', []);
					if (groups && groups.length > 0) {
						// RENDER GROUPS
						self.renderGroups(groups);
					} else {
						self.createDefaultGroups(() => {
							// RELOAD GROUPS
							self.fetchGroups();
						});
					}
				},
				error: function (xhr) {
					loader.error();
				}
			})
		},

		renderGroups: function (groups) {
			const self = this;
			groups = clone(groups);
			self.$el.find("#groups-container").empty();

			var send_now_group_id = null;
			groups.forEach((group, index) => {
				if (group.broadcast_type == "sendnow") {
					self.renderGroup(group);
					send_now_group_id = group._id;
				}
			});
			// LOAD SENDNOW AS DEFAULT
			if (send_now_group_id) {
				self.renderSendNows(send_now_group_id);
			}
		},

		renderGroup: function (group) {
			const self = this;
			var groupEl = self.$el.find("#groups-container");
			var groupView = new GroupModelView({
				viewData: {
					trial: (group.broadcast_type == 'trigger' || group.broadcast_type == 'schedule')
				}
			});
			groupView.model.set(group);
			groupView.render();
			groupEl.append(groupView.el);
			groupView.on("change", (event) => {
				// UPDATE GROUP
			});

			groupView.$el.find("#create_block").unbind("click").bind("click", () => {
				var groupId = groupView.model.get("_id");

				switch (groupView.model.get("broadcast_type")) {
					case 'sendnow':
						self.renderSendNows(groupId);
						break;
					case 'subscription':
						// self.renderSubscriptions(groupId);
						break;
					case 'trigger':
						// self.createTrigger(groupId);
						break;
					case 'schedule':
						// self.createSchedule(groupId);
						break;
					default:
						break;
				}
			});
		},

		renderSendNows: function (group_id) {
			const self = this;
			var sendNowCollection = new SendNowCollection();
			sendNowCollection.render();
			self.$el.find("#broadcast_container").html(sendNowCollection.el);
			// EVENTS
			sendNowCollection.on("create", () => {
				// CREATE NEW SEND NOW
				self.renderSendNowView({ group_id: group_id });
			});

			sendNowCollection.on("view", (broadcast_id) => {
				// CREATE DETAIL broadcast_id
				self.renderSendNowView({ _id: broadcast_id })
			});
		},

		renderSendNowView(broadcast) {
			const self = this;
			var botId = this.getApp().getRouter().getParam("id");

			if (!broadcast._id) {
				broadcast.name = 'Send Now';
				broadcast.type = 'sendnow';
				broadcast.conditions = {};
				broadcast.bot_id = botId;
				self.createDefaultBroadcast(broadcast, (response) => {
					broadcast = clone(response);
					var sendNowView = new SendNowModelView();
					sendNowView.model.set(broadcast);
					sendNowView.render();
					self.$el.find("#broadcast_container").html(sendNowView.el);
				});
			} else {
				var sendNowView = new SendNowModelView();
				sendNowView.model.set(broadcast);
				sendNowView.render();
				self.$el.find("#broadcast_container").html(sendNowView.el);
			}
			// EVENTS
		},

		renderSubscriptions: function (groupId) {
			const self = this;
			var subscriptionCollection = new SubscriptionCollection();
			subscriptionCollection.render();
			self.$el.find("#broadcast_container").html(subscriptionCollection.el);
			// EVENTS
			subscriptionCollection.on("create", () => {
				// CREATE NEW SUBSCRIPTION
				self.renderSubscriptionMessaging({ group_id: groupId });
			});

			subscriptionCollection.on("view", (broadcast_id) => {
				// CREATE DETAIL broadcast_id
				self.renderSubscriptionMessaging({ _id: broadcast_id });
			});
		},

		renderSubscriptionMessaging: function (broadcast) {
			const self = this;
			var botId = this.getApp().getRouter().getParam("id");

			if (!broadcast._id) {
				broadcast.name = 'Subscription Messaging';
				broadcast.type = 'subscription';
				broadcast.conditions = {};
				broadcast.bot_id = botId;
				self.createDefaultBroadcast(broadcast, (response) => {
					broadcast = clone(response);
					var subscriptionView = new SubscriptionModelView();
					subscriptionView.model.set(broadcast);
					subscriptionView.render();
					self.$el.find("#broadcast_container").html(subscriptionView.el);
				});
			} else {
				var subscriptionView = new SubscriptionModelView();
				subscriptionView.model.set(broadcast);
				subscriptionView.render();
				self.$el.find("#broadcast_container").html(subscriptionView.el);
			}
			// EVENTS
		},

		createDefaultGroups: function (callback) {
			var self = this;
			var botId = this.getApp().getRouter().getParam("id");

			self.defaultGroups.forEach((group, index) => {
				group.bot_id = botId;
				var groupView = new GroupModelView();
				groupView.model.set(group);
				loader.show();
				groupView.model.save(null, {
					success: function (model, respose, options) {
						loader.saved();
						callback();
					},
					error: function (model, xhr, options) {
						loader.error();
					}
				});
			});
		},

		createDefaultBroadcast: function (broadcast, callback) {
			var url = this.getApp().serviceURL + '/api/v1/broadcast';
			var method = "POST";
			if (broadcast._id) {
				method = "PUT";
				url = url + "/" + broadcast._id
			}
			loader.show();
			$.ajax({
				url: url,
				data: JSON.stringify(broadcast),
				type: method,
				success: function (response) {
					loader.saved();
					if (callback) {
						callback(response);
					}
				},
				error: function (xhr) {
					loader.error();
				}
			})
		}
	});

});