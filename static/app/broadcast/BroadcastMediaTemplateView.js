define(function (require) {
	"use strict";
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!./tpl/broadcast-media-template.html');
	var buttonTemplate = require('text!../card/tpl/button-template.html');
	var ATTRIBUTES_LABEL = require('json!app/common/attributes.json');
	var BlockSelectView = require('app/block/SelectView')
	var WebviewSelectView = require('app/webview/WebviewSelectView');
	var mediaUpload = require('app/common/MediaUpload');

	var schema = {
		"_id": {
			"type": "string",
			"primary": true
		},
		"type": {
			"type": "string",
			"default": "media"
		},
		"elements": {
			"type": "list"
		},
		"broadcast_id": {
			"type": "string"
		},
		"bot_id": {
			"type": "string"
		},
	};

	var elementSchema = {
		"media_type": {
			"type": "string",
			"default": "image"
		},
		"url": {
			"type": "string" // MEDIA URL
		},
		"url_view": {
			"type": "string" // MEDIA URL
		},
		"buttons": {
			"type": "list"
		}
	};

	var buttonSchema = {
		"_id": {
			"type": "string"
		},
		"title": {
			"type": "string"
		},
		"blocks": {
			"type": "list",
			"default": []
		},
		"url": {
			"type": "string",
			"default": null
		},
		"webview_height_ratio": {
			"type": "string",
			"default": null
		},
		"phone_number": {
			"type": "string",
			"default": null
		},
		"webview": {
			"type": "dict"
		},
		"type": {
			"type": "string",
			"default": "blocks"
		}
	};

	var ButtonView = Gonrin.ModelView.extend({
		bindings: "button-card-text-bind",
		modelSchema: buttonSchema,
		template: "",
		prevData: null,
		hasChange: false,
		uiControl: {
			fields: [
				{
					field: "blocks",
					uicontrol: "ref",
					textField: "name",
					selectionMode: "multiple",
					dataSource: BlockSelectView
				},
				{
					field: "webview",
					uicontrol: "ref",
					textField: "title",
					selectionMode: "single",
					dataSource: WebviewSelectView
				}
			]
		},

		render: function () {
			var self = this;
			self.hasChange = false;
			var translatedTpl = gonrin.template(buttonTemplate)(LANG);
			self.$el.empty();
			self.$el.append(translatedTpl);
			self.applyBindings();
			var _id = self.model.get("_id");

			self.prevData = clone(self.model.toJSON());
			self.$el.find(".card-button-title").unbind("click").bind("click", { obj: _id }, function (e) {
				var data_id = e.data.obj;
				self.getApp().trigger("card-button-click", data_id);
			});

			self.getApp().on("card-button-click", function (button_id) {
				var configEl = self.$el.find(".card-button-configure");
				if (self.model.get("_id") == button_id) {
					if (configEl.is(':hidden')) {
						configEl.show();

						configEl.find("button.card-button-configure-ok-button").unbind("click").bind("click", function (event) {
							event.stopPropagation();
							var data = self.model.toJSON();
							self.trigger("change", clone(data));
							configEl.hide();
						});
					}
				} else {
					self.$el.find(".card-button-configure").hide();
				}
			});

			//button detail click
			self.$el.find(".btn-block").unbind("click").bind("click", function (event) {
				event.stopPropagation();
				self.trigger("card-button-detail-click", "blocks");
			});
			self.$el.find(".btn-url").unbind("click").bind("click", function (event) {
				event.stopPropagation();
				self.trigger("card-button-detail-click", "url");

			});
			self.$el.find(".btn-phone").unbind("click").bind("click", function (event) {
				event.stopPropagation();
				self.trigger("card-button-detail-click", "phone");
			});
			self.$el.find(".btn-webview").unbind("click").bind("click", function (event) {
				event.stopPropagation();
				self.trigger("card-button-detail-click", "webview");
			});

			self.on("card-button-detail-click", function (type, update = true) {
				if (type == "blocks") {
					self.$el.find(".tab-block").show();
					self.$el.find(".tab-url").hide();
					self.$el.find(".tab-phone").hide();
					self.$el.find(".tab-webview").hide();

					if (update) {
						self.model.set("type", "postback");
						self.model.set("blocks", []);
						self.model.set("webview_height_ratio", null);
						self.model.set("url", null);
						self.model.set("webview", null);
					}

				} else if (type == "url") {
					self.$el.find(".tab-block").hide();
					self.$el.find(".tab-url").show();
					self.$el.find(".tab-phone").hide();
					self.$el.find(".tab-webview").hide();

					self.$el.find(".compact").unbind("click").bind("click", (event) => {
						self.$el.find(".compact input").prop({ "checked": true });
						self.$el.find(".tall input").prop({ "checked": false });
						self.$el.find(".full input").prop({ "checked": false });
						self.model.set("webview_height_ratio", "compact");
					});

					self.$el.find(".tall").unbind("click").bind("click", (event) => {
						self.$el.find(".tall input").prop({ "checked": true });
						self.$el.find(".compact input").prop({ "checked": false });
						self.$el.find(".full input").prop({ "checked": false });
						self.model.set("webview_height_ratio", "tall");
					});

					self.$el.find(".full").unbind("click").bind("click", (event) => {
						self.$el.find(".full input").prop({ "checked": true });
						self.$el.find(".compact input").prop({ "checked": false });
						self.$el.find(".tall input").prop({ "checked": false });
						self.model.set("webview_height_ratio", "full");
					});

					switch (self.model.get("webview_height_ratio")) {
						case 'compact':
							self.$el.find(".compact input").prop({ "checked": true });
							break;
						case 'tall':
							self.$el.find(".tall input").prop({ "checked": true });
							break;
						case 'full':
							self.$el.find(".full input").prop({ "checked": true });
							break;
					}

					if (update) {
						self.model.set("type", "web_url");
						self.model.set("blocks", []);
						self.model.set("webview_height_ratio", null);
						self.model.set("url", null);
						self.model.set('webview', null);
					}

				} else if (type == "phone") {
					self.$el.find(".tab-block").hide();
					self.$el.find(".tab-url").hide();
					self.$el.find(".tab-phone").show();
					self.$el.find(".tab-webview").hide();

					if (update) {
						self.model.set("type", "phone_number");
						self.model.set("blocks", []);
						self.model.set("webview_height_ratio", null);
						self.model.set("url", null);

					}
				} else if (type == "webview") {
					self.$el.find(".tab-block").hide();
					self.$el.find(".tab-url").hide();
					self.$el.find(".tab-phone").hide();
					self.$el.find(".tab-webview").show();

					if (update) {
						self.model.set("type", "webview");
						self.model.set("blocks", []);
						self.model.set("webview_height_ratio", null);
						self.model.set("url", null);
						self.model.set("webview", null);
					}
				}
			});

			//first init
			if ((self.model.get("type") || null) === "web_url") {
				self.trigger("card-button-detail-click", "url", false);
			} else if ((self.model.get("type") || null) === "phone_number") {
				self.trigger("card-button-detail-click", "phone", false);
			} else if ((self.model.get("type") || null) === "webview") {
				self.trigger("card-button-detail-click", "webview", false);
			} else {
				self.trigger("card-button-detail-click", "blocks", false);
			}

			//delete
			self.$el.find(".card-button-configure-delete-button").unbind("click").bind("click", function () {
				var data = self.model.toJSON();
				self.trigger("delete", data._id);
				self.remove();
			});
		}
	});

	return Gonrin.ModelView.extend({
		bindings: "card-media-bind",
		template: "",
		modelSchema: schema,
		urlPrefix: "/api/v1/",
		collectionName: "card",

		render: function () {
			var self = this;
			var translatedTpl = gonrin.template(template)(LANG);
			self.$el.html(translatedTpl);
			if (this.viewData) {
				var position = lodash.get(this.viewData, 'position', 0);
				self.$el.find(".position").html(position ? position : 0)
			}
			self.applyBindings();
			self.onClickMedia();

			self.$el.find(".container-hover").addClass('active');

			//change
			self.model.on("change", function () {
				console.log("change : ", self.model.toJSON())
				self.trigger("change", self.model.toJSON());
			});

			// delete
			self.$el.find(".delete_card").unbind("click").bind("click", function ($event) {
				self.trigger("delete_card", self.model.toJSON());
				self.remove();
			});

			self.$el.find(".up_card_position").unbind("click").bind("click", function ($event) {
				self.trigger("change_card_position", {
					"data": self.model.toJSON(),
					"action": "up"
				});
			});

			self.$el.find(".down_card_position").unbind("click").bind("click", function ($event) {
				self.trigger("change_card_position", {
					"data": self.model.toJSON(),
					"action": "down"
				});
			});

			var elements = self.model.get('elements');
			if (!elements || !Array.isArray(elements) || elements.length == 0) {
				elements = [{
					"media_type": "image",
					"url": "",
					"buttons": []
				}];
				self.model.set('elements', elements);
			}
			var buttons = elements[0].buttons;
			if (elements[0] && elements[0].url_view) {
				self.$el.find(".template_img").css({
					'background-image': 'url(' + elements[0].url_view + ')'
				});
			}

			if (!!buttons && (buttons.length > 0)) {
				for (var i = 0; i < buttons.length; i++) {
					self.renderButton(buttons[i]);
				}
			}
			// add new button
			self.$el.find(".add_button").unbind("click").bind("click", function () {
				var elements = self.model.get('elements');
				if (!elements || !Array.isArray(elements) || elements.length == 0) {
					elements = [{
						"media_type": "image",
						"url": "",
						"buttons": []
					}];
					self.model.set('elements', elements);
				}
				var buttons = elements[0].buttons;
				if (buttons.length < 3) {
					var data = Gonrin.getDefaultModel(buttonSchema);
					data['_id'] = gonrin.uuid()
					data["title"] = LANG.NEW_BUTTON;
					console.log("data : ", data)
					buttons.push(data);
					elements[0].buttons = buttons;
					self.model.set('elements', elements);
					self.model.trigger("change");
					self.renderButton(data);
				} else {
					self.getApp().notify({ message: "Giới hạn cho phép tạo tối đa 3 nút chức năng" }, { type: "danger", delay: 1000 });
				}
			});

			this.$el.find(".add_property").unbind("click").bind("click", ($event) => {
				console.log("add_property : ", add_property)
				var attributeSuggestionListEl = self.$el.find(".attribute_suggestion_list");
				if (attributeSuggestionListEl.is(':hidden')) {
					var attributes = []
					self.getApp().data("attributes").forEach((item, index) => {
						if (ATTRIBUTES_LABEL[item] ? ATTRIBUTES_LABEL[item] : item) {
							var clonedItem = {
								'index': index,
								'text': ATTRIBUTES_LABEL[item] ? ATTRIBUTES_LABEL[item] : item,
								'value': item
							};
							attributes.push(clonedItem);
						}
					});

					self.renderSuggestions(attributes);
				} else {
					attributeSuggestionListEl.hide();
				}
			});
		},

		renderButton: function (data) {
			var self = this;
			var view = new ButtonView();
			view.model.set(clone(data));
			view.render();
			self.$el.find(".buttons-container").append(view.$el);
			view.$el.attr("data-model", JSON.stringify(view.model.toJSON()));
			view.on("change", function (eventData) {
				var elements = self.model.get('elements');
				if (!elements || !Array.isArray(elements) || elements.length == 0) {
					elements = [{
						"media_type": "image",
						"url": "",
						"buttons": []
					}];
					self.model.set('elements', elements);
				}
				var buttons = elements[0].buttons;
				// check and change promotion_conditions
				buttons.forEach((item, index) => {
					if (item._id == eventData._id || item.id == eventData._id) {
						delete eventData.id;
						buttons[index] = eventData;
					}
				});
				elements[0].buttons = buttons;
				self.model.set("elements", elements);
				self.model.trigger("change");
			});

			view.on("delete", function (event) {
				console.log("delete")
				var elements = self.model.get('elements');
				if (!elements || !Array.isArray(elements) || elements.length == 0) {
					elements = [{
						"media_type": "image",
						"url": "",
						"buttons": []
					}];
					self.model.set('elements', elements);
				}
				var buttons = elements[0].buttons;
				for (var idx = 0; idx < buttons.length; idx++) {
					if (buttons[idx]._id === view.model.get("_id")) {
						buttons[idx] = event.data;
						buttons.splice(idx, 1);
						break;
					}
				}
				elements[0].buttons = buttons;
				self.model.set("elements", elements);
				self.model.trigger("change");
			});
		},

		renderSuggestions: function (attributes) {
			const self = this;
			console.log("attributes : ", attributes)
			var suggestionEl = self.$el.find(".attribute_suggestion_list");
			suggestionEl.empty();
			attributes.forEach((item, index) => {
				suggestionEl.append(self.getDropdownTemplate(item));
				self.$el.find(".dropdown_item_" + item.index).unbind("click").bind("click", ($event) => {
					suggestionEl.hide();
					var text = self.model.get('text');
					text += "{{" + item.value + "}}";
					self.model.set('text', text);
				});
			});
			suggestionEl.show();
		},

		getDropdownTemplate: function (item) {
			console.log("item : ", item)
			const self = this;

			var html = `<li><a id="dropdown_item_${item.index}">`;
			html += item.text;
			html += `</a></li>`;

			return html;
		},

		onClickMedia: function () {
			var self = this;
			this.$el.find(".template_img").unbind("click").bind("click", () => {
				var bot_id = this.getApp().getRouter().getParam("id");
				mediaUpload({ path: 'crm' }, null, (data) => {
					if (data && data.link) {
						var elements = self.model.get('elements');
						elements[0].url_view = data.link;
						self.model.set('elements', elements);
						self.trigger('change', self.model.toJSON());
						self.$el.find(".template_img").css({
							'background-image': 'url(' + data.link + ')'
						});

						spinner.show();
						$.ajax({
							url: self.getApp().serviceURL + "/api/v1/bot/get_by_bot_id",
							data: "bot_id=" + bot_id,
							type: "GET",
							success: function (dataBot) {
								spinner.hide();
								var page_id = dataBot.page_id;
								var token = dataBot.token;
								var fb_upload_body = {
									"url": data.link,
									"published": "false"
								}

								spinner.show();
								$.ajax({
									url: "https://graph.facebook.com/v2.11/me/photos?access_token=" + token,
									type: "POST",
									data: JSON.stringify(fb_upload_body),
									success: (response) => {
										spinner.hide();
										elements[0].url = "https://www.facebook.com/photo.php?fbid=" + response.id;
										self.model.set('elements', elements);
										self.trigger('change', self.model.toJSON());
									},
									error: (error) => {
										spinner.hide();
									}
								});
							},
							error: (error) => {
								spinner.hide();
							}
						});
					}
				});
			});

		}
	});

});