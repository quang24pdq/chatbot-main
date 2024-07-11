define(function (require) {
	"use strict";
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!./tpl/grow-collection.html');
	var schema = require("json!schema/FeedEventSchema.json");
	var Helpers = require('app/common/Helpers');
	var CommentRuleDialogView = require('app/grows/comment/CommentRuleDialogView');
	var CommentRuleItemView = require('app/grows/comment/CommentRuleItemView');
	var CustomerChatPluginDiaLog = require('app/grows/CustomerChatPluginDiaLog');
	var DownloadMessageCodeDialog = require('app/grows/DownloadMessageCodeDialog');
	var WebviewItemView = require('app/webview/WebviewItemView');
	var WebviewSettingDialog = require('app/webview/WebviewSettingDialogView');

	return Gonrin.CollectionView.extend({
		template: '',
		modelSchema: schema,
		urlPrefix: "/api/v1/",
		collectionName: "feed_item",
		feedItems: [],
		render: function () {
			var self = this;
			self.loadScreenData();
			self.registerEvent();

			return this;
		},

		loadScreenData: function () {
			const self = this;
			var translatedTemplate = gonrin.template(template)(LANG);
			self.$el.html(translatedTemplate);
			const botId = this.getApp().getRouter().getParam("id");
			// fetch all "feed_event" type: "comment"
			$.ajax({
				url: self.getApp().serviceURL + '/api/v1/facebook/feed_item',
				data: "q=" + JSON.stringify({ filters: { "$and": [{ "bot_id": { "$eq": botId } }] } }),
				type: "GET",
				success: function (response) {
					self.feedItems = clone(response.objects);
					self.renderCommentRules();
					self.loadDefaultScreen();
				},
				error: function () {

				}
			});

			self.loadWebviews();
		},

		loadWebviews: function() {
			const self = this;
			const botId = this.getApp().getRouter().getParam("id");
			$.ajax({
				url: self.getApp().serviceURL + '/api/v1/webview',
				data: "q=" + JSON.stringify({ filters: { "$and": [{ "bot_id": { "$eq": botId } }] } }),
				type: "GET",
				success: function (response) {
					var objects = lodash.get(response, 'objects', []);
					self.renderWebviewItem(objects);
				},
				error: function (xhr) {
					console.warn(xhr);
				}
			});
		},

		loadDefaultScreen: function () {
			const self = this;
			const botId = this.getApp().getRouter().getParam("id");
			// AUTO MESSAGE WHEN COMMENT
			var html_tooltip = '<div class="row"><p>When testing your rule, do not forget to change the "commenting as" setting from your Facebook page to your personal account.</p></div>'
				+ '<div class="row"><img src=""></div>';
			var currentBot = self.getApp().data("current_bot");
			if (currentBot !== null && currentBot !== undefined) {
				self.$el.find("#page_name").html(currentBot.page_name);
			}
			self.$el.find('#tooltip_comment').tooltip({ title: html_tooltip, html: true, placement: 'auto' });

			self.$el.find("#auto_message_from_comment").find("#add_rule").unbind('click').bind('click', () => {
				console.log("auto_message_from_comment click");
				var commentRuleDialogView = new CommentRuleDialogView();
				commentRuleDialogView.dialog({
					size: 'large'
				});

				commentRuleDialogView.on("save", (data) => {
					self.saveCommentRule(data);
				});
			});
		},

		renderCommentRules: function () {
			var self = this;
			var ruleContainerEl = self.$el.find("#rule-container");
			ruleContainerEl.empty();

			self.feedItems.forEach((feedItem) => {
				if (feedItem && feedItem.feed_item && feedItem.feed_item == "comment") {
					feedItem.rules.forEach((commentRule, idx) => {
						var rule = clone(commentRule);
						var view = new CommentRuleItemView({
							viewData: rule
						});
						view.render();
						view.on("deleted", (data) => {
							self.saveCommentRule(data, true);
						});
						ruleContainerEl.append(view.$el);
						ruleContainerEl.find("#" + rule._id).find("label").unbind("click").bind("click", function (event) {
							var clonedRule = clone(rule);
							var commentRuleDialogView = new CommentRuleDialogView();
							commentRuleDialogView.model.set(clonedRule);
							commentRuleDialogView.dialog({
								size: 'large'
							});

							commentRuleDialogView.on("save", (data) => {
								self.saveCommentRule(data);
							});
						})
					});
				}
			});
		},

		saveCommentRule(data, isDelete = false) {
			const self = this;
			const botId = this.getApp().getRouter().getParam("id");
			var url = self.getApp().serviceURL + "/api/v1/facebook/feed_item";
			var method = "POST";
			// add rule to feed rules
			var updateFeed = null;
			var feedFlag = true;
			self.feedItems.forEach(feed => {
				if (feed.feed_item == "comment") {
					feedFlag = false;
					updateFeed = clone(feed);
					var ruleFlag = true;
					if (Array.isArray(updateFeed.rules)) {
						updateFeed.rules.forEach((rule, idx) => {
							if (rule._id == data._id) {
								if (!isDelete) {
									updateFeed.rules[idx] = data;
								} else {
									updateFeed.rules.splice(idx, 1);
								}
								ruleFlag = false;
							}
						});

						if (ruleFlag) {
							updateFeed.rules.push(data);
						}

					} else {
						updateFeed.rules = [data];
					}
				}
			});
			if (feedFlag == true) {
				updateFeed = Gonrin.getDefaultModel(schema);
				updateFeed.bot_id = botId;
				updateFeed.feed_item = "comment";
				updateFeed.active = true;
				updateFeed.rules = [data];
			} else {
				url = url + "/" + updateFeed._id;
				method = "PUT";
			}
			loader.show();
			$.ajax({
				url: url,
				data: JSON.stringify(updateFeed),
				type: method,
				success: function (response) {
					self.loadScreenData();
					loader.saved();
				},
				error: function (error) {
					loader.error();
				}
			});
		},

		saveFeedItem: function (feedItem) {
			const self = this;
			var url = self.getApp().serviceURL + "api/v1/facebook/feed_item";
			var method = "POST";
			if (feedItem._id) {
				method = "PUT";
				url = self.getApp().serviceURL + "/api/v1/facebook/feed_item/save/attrs"
			}
			loader.show();
			$.ajax({
				url: url,
				data: JSON.stringify(feedItem),
				type: method,
				success: function (response) {
					loader.saved();
				},
				error: function (error) {
					loader.error();
				}
			});
		},

		renderWebviewItem: function (webviews) {
			const self = this;
			var webviewContainerEl = self.$el.find("#webview_container");
			webviewContainerEl.empty();
			webviews.forEach((data, index) => {
				var webView = new WebviewItemView({
					viewData: data
				});
				webView.render();
				$(webView.el).hide().appendTo(webviewContainerEl).fadeIn();
				// REGISTER EVENTS OF WEBVIEW
				webView.on("change", () => {
					self.loadWebviews();
				});
			});
		},

		registerEvent: function () {
			var self = this;
			self.$el.find("#enable_message").unbind("click").bind("click", function () {
				var customerChatPluginDiaLog = new CustomerChatPluginDiaLog();
				customerChatPluginDiaLog.dialog();
			});

			self.$el.find("#download-message-code").unbind("click").bind("click", function () {
				var downloadMessageCodeDialog = new DownloadMessageCodeDialog();
				downloadMessageCodeDialog.dialog();

				downloadMessageCodeDialog.on("close", function (imgLink) {
					self.$el.find("#img-preview").html(
						`<img src="${imgLink}" style="width: 100%; height: auto;"/>`
					);
					self.$el.find("#img-link").val(imgLink);

					self.$el.find("#img-copy").unbind("click").bind("click", (data) => {
						var copyText = document.getElementById("img-link");
						copyText.select();
						document.execCommand("copy");
					});
				});
			});

			self.$el.find("#add_new_webview").unbind("click").bind("click", () => {
				var webviewDialog = new WebviewSettingDialog();
				
				webviewDialog.dialog({
					size: "large"
				});
			});
		}
	});
});
