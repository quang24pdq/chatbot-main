define(function (require) {
	"use strict";
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!./tpl/model.html'),
		schema = require('json!schema/BroadcastSchema.json');
	var blockSchema = require('json!schema/BlockSchema.json');
	var Helper = require('app/common/Helpers');
	var ConditionModelView = require('app/condition/ConditionModelView');

	var BroadcastBlockView = require('app/broadcast/BroadcastBlockView');

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
					error: function (xhr) {
						console.log('error');
					}
				});
			} else {
				self.model.set('name', 'Send Now');
				self.model.set('type', 'sendnow');
				self.model.set('conditions', {});
				self.model.set('created_at', Helper.now_timestamp());
				self.model.save(null, {
					success: function (data) {
						self.model.set(data);
						self.applyBindings();
						self.loadData();
						self.registerEvents();
					},
					error: function (xhr) {
						console.log("error: ", xhr);
					}
				});
			}
		},

		loadData: function () {
			const self = this;
			if (!self.model.get('sent_time')) {
				self.$el.find(".broadcast-overlay").addClass("hide");
			}

			let useTimeCondition =  this.model.get("use_time_condition");
			if (useTimeCondition === true) {
				// SHOW TIME CONDITIONS AREA
				self.$el.find("div[for='time_conditons']").fadeIn();
				self.$el.find(".switch input[id='use_time_condition_switch']").prop("checked", true);
			} else {
				// HIDE TIME CONDITIONS AREA
				self.$el.find("div[for='time_conditons']").fadeOut();
			}

			var conditions = self.model.get("conditions");
			var operatorAnd = lodash.get(conditions, 'and', []);
			if (operatorAnd && Array.isArray(operatorAnd)) {
				operatorAnd.forEach((condition, index) => {
					var conditionView = new ConditionModelView();
					conditionView.model.set(condition);
					conditionView.render();
					this.$el.find("#filter-card").html(conditionView.el);
					conditionView.on('change', (data) => {
						var conditions = self.model.get('conditions');
						var operatorAnd = lodash.get(conditions, 'and', []);
						if (!operatorAnd || !Array.isArray(operatorAnd)) {
							operatorAnd = [];
						}
						operatorAnd.push(data);
						conditions['and'] = operatorAnd;
						self.model.set('conditions', conditions);
						self.model.trigger('change:conditions');
					});
	
					conditionView.on("delete", (_id) => {
						var conditions = self.model.get('conditions');
						var operatorAnd = lodash.get(conditions, 'and', []);
						if (!operatorAnd || !Array.isArray(operatorAnd)) {
							operatorAnd = [];
						}
						operatorAnd.forEach((condition, index) => {
							if (condition._id == _id) {
								operatorAnd.splice(index, 1);
							}
						});
						conditions['and'] = operatorAnd;
						self.model.set('conditions', conditions);
						self.model.trigger('change:conditions');
						conditionView.destroy();
					});
				});
			}
			self.renderBlocks();
		},

		registerEvents: function () {
			const self = this;

			this.model.on("change", () => {
				spinner.show();
				self.model.save(null, {
					success: function (data) {
						spinner.hide();
					},
					error: function (xhr) {
						spinner.error('Không thể sửa sau khi broadcast.');
					}
				});
			});

			this.model.on("change:use_time_condition", () => {
				if (this.model.get('use_time_condition') === true) {
					// SHOW TIME CONDITIONS AREA
					self.$el.find("div[for='time_conditons']").fadeIn();
				} else {
					// HIDE TIME CONDITIONS AREA
					self.$el.find("div[for='time_conditons']").fadeOut();
					self.model.set("target_from", null);
					self.model.set("target_to", null);
				}
			});

			this.model.on("change:conditions", () => {
				spinner.show();
				self.model.save(null, {
					success: function (data) {
						spinner.hide();
					},
					error: function (xhr) {
						spinner.error('Không thể sửa sau khi broadcast.');
					}
				});
			});

			let target_from = this.model.get('target_from');
			this.$el.find("#time_from").datetimepicker({
				textFormat:'DD/MM/YYYY',
				parseInputDate: function(val) {
					// console.log("parseInputDate ", val);
					// return moment.unix(val);
					return moment(Helper.now_timestamp());
				},
				parseOutputDate: function(date) {
					let timestamp = date.local().unix() * 1000;
					self.model.set("target_from", timestamp);
					return timestamp / 1000;
				}
			});
			this.$el.find("#time_from").data("gonrin").setValue(target_from);

			let target_to = this.model.get('target_to');
			this.$el.find("#time_to").datetimepicker({
				textFormat:'DD/MM/YYYY',
				parseInputDate: function(val) {
					// console.log("parseInputDate ", val);
					// return moment.unix(val);
					return moment(Helper.now_timestamp());
				},
				parseOutputDate: function(date) {
					let dateStr = date.local().format("DD/MM/YYYY");
					let endDatetime = dateStr + " 23:59";
					let endTimestamp = moment(endDatetime, "DD/MM/YYYY HH:mm").unix() * 1000;
					self.model.set("target_to", endTimestamp);
					return endTimestamp / 1000;
				}
			});
			this.$el.find("#time_to").data("gonrin").setValue(target_to);

			self.$el.find(".switch input[id='use_time_condition_switch']").unbind("click").bind("click", function ($event) {
                if ($(this).is(":checked")) {
                    self.model.set("use_time_condition", true);
                } else {
                    self.model.set("use_time_condition", false);
                }
            })

            // if (self.model.get("use_time_condition") === true) {
            //     self.$el.find(".switch input[id='use_time_condition_switch']").prop("checked", true);
            // }

			this.$el.find("#sendnow").unbind("click").bind("click", () => {
				const bot_id = self.getApp().getRouter().getParam("id");
				const broadcast_id = self.model.get('_id');
				spinner.show();
				$.ajax({
					type: "POST",
					url: self.getApp().serviceURL + '/api/v1/broadcast/push',
					data: JSON.stringify({
						'broadcast_id': broadcast_id,
						'bot_id': bot_id
					}),
					success: function (response) {
						spinner.hide();
						self.$el.find("#sendnow").prop('disabled', true);
						self.$el.find(".broadcast-overlay").addClass("hide");
					},
					error: function (xhr) {
						spinner.error();
					}
				});
			});

			self.$el.find("#add_condition").unbind("click").bind("click", () => {
				var conditionView = new ConditionModelView();
				conditionView.model.set('_id', gonrin.uuid());
				conditionView.render();
				self.$el.find("#filter-card").append(conditionView.el);

				conditionView.on('change', (data) => {
					var conditions = self.model.get('conditions');
					var operatorAnd = lodash.get(conditions, 'and', []);
					if (!operatorAnd || !Array.isArray(operatorAnd)) {
						operatorAnd = [];
					}
					operatorAnd.push(data);
					conditions['and'] = operatorAnd;
					self.model.set('conditions', conditions);
					self.model.trigger('change:conditions');
				});

				conditionView.on("delete", (_id) => {
					var conditions = self.model.get('conditions');
					var operatorAnd = lodash.get(conditions, 'and', []);
					if (!operatorAnd || !Array.isArray(operatorAnd)) {
						operatorAnd = [];
					}
					operatorAnd.forEach((condition, index) => {
						if (condition._id == _id) {
							operatorAnd.splice(index, 1);
						}
					});
					conditions['and'] = operatorAnd;
					self.model.set('conditions', conditions);
					self.model.trigger('change:conditions');
					conditionView.destroy();
				});
			});

			self.$el.find("#btn_add_broadcast_block").unbind("click").bind("click", () => {
				var bot_id = self.getApp().getRouter().getParam("id");
				var broadcast_id = self.model.get('_id');
				var broadcastBlockEls = self.$el.find(".broadcast-block");
				var ref_link = {
					"active": false,
					"param": null
				};
				$.ajax({
					type: "POST",
					url: self.getApp().serviceURL + '/api/v1/block',
					data: JSON.stringify({
						"name": broadcastBlockEls.length + 1,
						"type": "broadcast",
						"ref_link": ref_link,
						"position": Helper.now_timestamp(),
						"broadcast_id": broadcast_id,
						"bot_id": bot_id,
					}),
					success: function (data) {
						self.renderBroadcastBlock(data);
					},
					error: function (xhr) { }
				});

			});

			this.$el.find(".btn_delete_broadcast").unbind("click").bind("click", () => {
				$.confirm({
					title: LANG.CONFIRM,
					content: LANG.CONFIRM_DELETE,
					buttons: {
						Delete: {
							btnClass: "btn-danger",
							action: function () {
								var broadcast_id = self.model.get('_id');
								spinner.show();
								$.ajax({
									url: self.getApp().serviceURL + "/api/v1/broadcast/" + broadcast_id,
									type: "DELETE",
									contentType: "application/json",
									dataType: 'json',
									data: JSON.stringify({
										'broadcast_id': broadcast_id
									}),
									success: function (response) {
										spinner.hide();
										if (response && response.error_code) {
											self.getApp().notify({ 'message': response.error_message }, { type: "danger" });
										} else {
											self.remove();
										}
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

			// this.registerCardEvents();
		},

		registerCardEvents: function () {
			const self = this;
			var botId = this.getApp().getRouter().getParam("id");
			var broadcastId = self.model.get('_id');
			var cardEls = this.$el.find("#cards li a");
			$.each(cardEls, (index, element) => {
				$(element).unbind("click").bind("click", (event) => {
					if (!self.model.get("sent_time")) {
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

		renderCards: function (cards) {
			const self = this;
			var botId = this.getApp().getRouter().getParam("id");
			// GET ALL CARDS
			self.$el.find("#cards-container").empty();
			spinner.show();
			$.ajax({
				url: self.getApp().serviceURL + '/api/v1/card',
				data: { q: JSON.stringify({ filters: { 'bot_id': botId, 'broadcast_id': self.model.get('_id') } }) },
				type: "GET",
				success: function (response) {
					spinner.hide();
					var cards = lodash.get(response, 'objects', []);
					cards.forEach((card, index) => {
						self.renderCard(card.type, card);
					});
				},
				error: function (xhr) {
					spinner.error();
				}
			});

		},

		renderCard: function (key, modelData) {
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
						spinner.show();
						cardView.model.destroy({
							success: function (model, response) {
								spinner.hide();
							},
							error: function (model, xhr, options) {
								spinner.error();
							}
						});
					}
				});
			}
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
					spinner.error();
				}
			})
		},

		renderBroadcastBlock: function (modelData = null) {
			const self = this;
			var broadcastBlockContainerEl = self.$el.find("#broadcast_block_container");
			var broadcastBlock = new BroadcastBlockView();
			broadcastBlock.model.set(modelData);
			broadcastBlock.render();
			$(broadcastBlock.el).appendTo(broadcastBlockContainerEl).fadeIn();
			broadcastBlock.on('change', () => { });

			broadcastBlock.on('delete', () => { });
		},

		renderBlocks: function () {
			const self = this;
			var botId = this.getApp().getRouter().getParam("id");
			// GET ALL BROADCAST BLOCKS
			var broadcastBlockContainerEl = self.$el.find("#broadcast_block_container");
			broadcastBlockContainerEl.empty();
			spinner.show();
			$.ajax({
				url: self.getApp().serviceURL + '/api/v1/block',
				data: { q: JSON.stringify({ filters: { 'bot_id': botId, 'broadcast_id': self.model.get('_id') } }) },
				type: "GET",
				success: function (response) {
					spinner.hide();
					var blocks = lodash.get(response, 'objects', []);
					if (blocks.length > 0) {
						blocks.forEach((block, index) => {
							self.renderBroadcastBlock(block);
						});
					} else {
						self.renderCards();
					}
				},
				error: function (xhr) {
					spinner.error();
				}
			});
		}
	});

});