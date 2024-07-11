define(function (require) {
	"use strict";
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!./tpl/comment-rule-dialog.html'),
		schema = require('json!schema/CommentRuleSchema.json');
	var Helpers = require('app/common/Helpers');
	var ReplyCommentRuleItem = require('app/grows/comment/ReplyCommentRuleItem');

	var defaultRule = {
		_id: gonrin.uuid(),
		name: null,
		post_link: null,
		post_id: null,
		scope: 'any',
		reply_limit: -1,
		comment_level: -1,
		action_type: "reply_comment", // reply_comment, send_private_message, hide_comment
		user_group_id: null,
		rules: [
			{
				_id: gonrin.uuid(),
				default: true,
				intents: null, // AI
				text: [],
				reply: {
					message: ''
				}
			}
		],
		active: true,
		bot_id: null
	}

	return Gonrin.ModelDialogView.extend({
		template: '',
		modelSchema: schema,
		urlPrefix: "/api/v1/",
		collectionName: "rulecomment",
		onInit: true,
		uiControl: {
			fields: [
				{
					field: "scope",
					uicontrol: "radio",
					textField: "text",
					valueField: "value",
					cssClassField: "cssClass",
					dataSource: [
						{ value: "any", text: LANG.GROW_COMMENT_RULE_SCOPE_ANY },
						{ value: "one", text: LANG.GROW_COMMENT_RULE_SCOPE_ONE },
					],
				},
			]
		},
		render: function () {
			var self = this;
			self.$el.empty();
			var translatedTemplate = gonrin.template(template)(LANG);
			self.$el.html(translatedTemplate);
			const bot_id = this.getApp().getRouter().getParam("id");
			if (!self.model.get("_id")) {
				self.model.set(defaultRule);
				self.model.set("name", (LANG && LANG.CREATE_NEW_RULE) ? LANG.CREATE_NEW_RULE : "New Rule");
				self.model.set('bot_id', bot_id);
			}
			self.model.on("change:scope", function (e) {
				if (self.model.get("scope") === "one") {
					self.$el.find("#specific_link").show();
				} else {
					self.$el.find("#specific_link").hide();
				}
			});

			if (self.model.get("scope") == "one") {
				self.model.trigger("change:scope");
			}
			self.applyBindings();

			if (!self.getApp().intents) {
				self.loadWitIntents((intents) => {
					self.getApp().intents = intents;
					self.registerEvents();
					self.loadDefaultScreen();
					self.newUiControl();
					self.onInit = false;
				});
			} else {
				self.registerEvents();
				self.loadDefaultScreen();
				self.newUiControl();
				self.onInit = false;
			}
		},

		loadWitIntents: function (callback=null) {
            const self = this;
            var bot_id = this.getApp().getRouter().getParam("id");
            spinner.show();
            $.ajax({
                url: self.getApp().serviceURL + "/api/v1/wit/intents",
                data: {
                    'id': bot_id
                },
                type: "GET",
                success: function (response) {
                    spinner.hide();
					if (response) {
						var intentMap = response.map((intent, idx) => {
							if (LANG.WIT_AI && LANG.WIT_AI.INTENTS && LANG.WIT_AI.INTENTS[intent.name]) {
								intent['label'] = LANG.WIT_AI.INTENTS[intent.name];
								return intent
							} else {
								intent['label'] = intent.name + " (beta)";
								return intent
							}
						});
			
						intentMap.unshift({
							'name': 'do_not_use',
							'label': LANG.WIT_AI['do_not_use']
						})
						if (callback) {
							callback(intentMap);
						}
					}
                    // self.intents = response;
                },
                error: function (xhr) {
                    spinner.error();
                    if (callback) {
                        callback([{
							'name': 'do_not_use',
							'label': LANG.WIT_AI['do_not_use']
						}]);
                    }
                }
            });
        },

		registerEvents: function () {
			const self = this;

			self.$el.find("#add_more_rules").unbind("click").bind("click", function () {
				self.addNewRule();
			});

			self.$el.find("#rule_comment_cancel").unbind("click").bind("click", function () {
				self.close();
				self.destroy();
			});
			self.$el.find("#rule_comment_save").unbind("click").bind("click", function () {
				if (!self.validate()) {
					return;
				}
				self.trigger("save", self.model.toJSON());
				self.close();
				self.destroy();
			});

		},

		loadDefaultScreen: function () {
			const self = this;
			const bot_id = this.getApp().getRouter().getParam("id");

			// reading default data
			var rules = this.model.get("rules");
			if (rules && Array.isArray(rules)) {
				rules.forEach((rule, index) => {
					var ruleItemView = new ReplyCommentRuleItem({
						'viewData': {
							'intents': self.getApp().intents
						}
					});
					ruleItemView.model.set(rule);
					ruleItemView.render();

					self.$el.find("#rule_container").append(ruleItemView.el);

					ruleItemView.on('change', (data) => {
						var rules = self.model.get('rules');
						rules.forEach((rule, index) => {
							if (rule._id == data._id) {
								rules[index] = data;
							}
						});
						self.model.set('rules', clone(rules));
					});

					ruleItemView.on('delete', (_id) => {
						var rules = self.model.get('rules');
						rules = rules.filter(rule => rule._id != _id);
						self.model.set('rules', clone(rules));
					});
				});
			}

			// ACTIONS
			self.$el.find("#auto_reply_action").unbind("click").bind("click", function (event) {
				self.$el.find("#auto_reply_action").removeClass("btn-default");
				self.$el.find("#auto_reply_action").addClass("btn-primary");
				self.$el.find("#action-container").show();
				self.$el.find("#reply-content").show();

				self.$el.find(".action-btn-group").find("button").each((index, actionBtn) => {
					if ($(actionBtn).attr('id') != "auto_reply_action") {
						$(actionBtn).removeClass("btn-primary");
						$(actionBtn).addClass("btn-default");
					}
				});
				self.$el.find("#action-container").find("#reply-content").removeClass("hide");

				var action_type = self.model.get("action_type") ? self.model.get("action_type") : null;
				if (action_type && action_type != "reply_comment") {
					self.$el.find("#reply-content textarea").val("");
				}
				action_type = "reply_comment";
				self.model.set("action_type", action_type);
			});
			self.$el.find("#send_private_message").unbind("click").bind("click", function (event) {
				self.$el.find("#send_private_message").removeClass("btn-default");
				self.$el.find("#send_private_message").addClass("btn-primary");
				self.$el.find("#action-container").show();
				self.$el.find("#reply-content").show();

				self.$el.find(".action-btn-group").find("button").each((index, actionBtn) => {
					if ($(actionBtn).attr('id') != "send_private_message") {
						$(actionBtn).removeClass("btn-primary");
						$(actionBtn).addClass("btn-default");
					}
				});
				self.$el.find("#action-container").find("#reply-content").removeClass("hide");
				var action_type = self.model.get("action_type") ? self.model.get("action_type") : null;
				if (action_type && action_type != "send_private_message") {
					self.$el.find("#reply-content textarea").val("");
				}
				action_type = "send_private_message";
				self.model.set("action_type", action_type);
			});

			self.$el.find("#hide-comment-action").unbind("click").bind("click", function (event) {
				self.$el.find("#hide-comment-action").removeClass("btn-default");
				self.$el.find("#hide-comment-action").addClass("btn-primary");

				self.$el.find("#action-container").hide();
				self.$el.find("#reply-content").hide();
				self.$el.find("#reply-content textarea").val("");

				self.$el.find(".action-btn-group").find("button").each((index, actionBtn) => {
					if ($(actionBtn).attr('id') != "hide-comment-action") {
						$(actionBtn).removeClass("btn-primary");
						$(actionBtn).addClass("btn-default");
					}
				});
				self.model.set("action_type", "hide_comment");

				if (self.onInit && self.model.get('reply_limit') && self.model.get("reply_limit") > 0) {
					self.model.set("reply_limit", -1)
				} else if (self.model.get('reply_limit') && self.model.get("reply_limit") > 0) {
					self.$el.find(".switch input[id='reply-limit-switch']").trigger("click");
				}
			});

			var action_type = this.model.get("action_type");
			if (!action_type || !action_type || action_type == "reply_comment") {
				self.$el.find("#auto_reply_action").trigger("click");
			} else if (action_type && action_type == "send_private_message") {
				self.$el.find("#send_private_message").trigger("click");
			} else if (action_type && action_type == "hide_comment") {
				self.$el.find("#hide-comment-action").trigger("click");
			}

		},

		addNewRule: function () {
			const self = this;
			var ruleItemView = new ReplyCommentRuleItem({
				'viewData': {
					'intents': self.getApp().intents
				}
			});
			ruleItemView.model.set('_id', gonrin.uuid());
			ruleItemView.render();
			self.$el.find("#rule_container").prepend(ruleItemView.el);
			var rules = self.model.get('rules');
			rules.unshift(ruleItemView.model.toJSON());
			self.model.set('rules', clone(rules));

			ruleItemView.on('change', (data) => {
				var rules = self.model.get('rules');
				rules.forEach((rule, index) => {
					if (rule._id == data._id) {
						rules[index] = data;
					}
				});
				self.model.set('rules', clone(rules));
			});

			ruleItemView.on('delete', (_id) => {
				var rules = self.model.get('rules');
				rules = rules.filter(rule => rule._id != _id);
				self.model.set('rules', clone(rules));
			});
		},

		newUiControl: function () {
			var self = this;
			self.$el.find(".switch input[id='reply-limit-switch']").unbind("click").bind("click", function ($event) {
				const thisEl = this;
				if ($(thisEl).is(":checked")) {
					self.model.set("reply_limit", 1);
				} else {
					self.model.set("reply_limit", -1);
				}
			});
			if (self.model.get("reply_limit") && self.model.get("reply_limit") == 1) {
				self.$el.find(".switch input[id='reply-limit-switch']").prop("checked", true);
			}
			self.$el.find(".switch input[id='without-child-comment-switch']").unbind("click").bind("click", function ($event) {
				const thisEl = this;
				if ($(thisEl).is(":checked")) {
					self.model.set("comment_level", 1);
				} else {
					self.model.set("comment_level", -1);
				}
			});
			if (self.model.get("comment_level") != null && self.model.get("comment_level") >= 0) {
				self.$el.find(".switch input[id='without-child-comment-switch']").prop("checked", true);
			}
		},

		validate: function () {
			const self = this;
			if (self.model.get("action") && self.model.get("action").action_type != "hide_comment"
				&& (!self.$el.find("#action-container textarea").val() || !self.$el.find("#action-container textarea").val().trim())) {
				self.$el.find("#action-container textarea").addClass("input-invalid");
				return false;
			}
			return true;
		}
	});

});