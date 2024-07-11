define(function (require) {
	"use strict";
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!./tpl/sidemenu.html');
	var item_template = require('text!./tpl/sideitem.html');
	var Helper = require("app/common/Helpers");

	var entries = [
		{
			"text": "{{STRUCTURE}}",
			//"icon": "fa fa-arrow-left",
			"icon": "fa fa-project-diagram",
			"action": "structure"
		},
		{
			"text": "{{SETUP_AI}}",
			"icon": "far fa-comments",
			"action": "ai-setup"
		},
		// {
		// 	"text": "Live Chat",
		// 	"icon": "fa fa-comment",
		// 	"action": "livechat"
		// },
		{
			"text": "{{PERSISTENT_MENU}}",
			"icon": "fa fa-bars",
			"action": "persistentmenu"
		},
		{
			"text": "{{CONFIGURATION}}",
			"icon": "fa fa-cog",
			"action": "configuration"
		},
		{
			"text": "{{CONTACT}}",
			"icon": "fa fa-users",
			"action": "contact"
		},
		{
			"text": "{{BROADCAST}}",
			"icon": "fa fa-bullhorn",
			"action": "broadcast"
		},
		{
			"text": "{{GROW}}",
			"icon": "fa fa-chart-line",
			"action": "grow"
		},
		// {
		// 	"text": "{{SETTING}}",
		// 	"icon": "fa fa-cogs",
		// 	"action": "setting"
		// }'
		{
			"text": "{{STATISTIC}}",
			"icon": "fa fa-chart-pie",
			"action": "statistic"
		},
	];

	return Gonrin.View.extend({
		template: template,
		render: function () {
			var self = this;
			var id = self.getApp().getRouter().getParam("id");
			//var action = $(this).attr("data-action");
			var action = this.getApp().getRouter().getParam("action") || "structure";

			$.each(entries, function (idx, entry) {
				var tpl = gonrin.template(item_template)(entry);
				var translatedTpl = gonrin.template(tpl)(LANG);
				var $el = $(translatedTpl);
				var link = $el.find("#side-menu-item-link");
				if (link.hasClass("side-menu-item-" + action)) {
					link.addClass("active")
				}
				$el.unbind("click").bind("click", function () {
					//var id = self.getApp().getRouter().getParam("id");
					var item_action = $(this).attr("data-action");
					var path = 'bot/model?id=' + id + "&action=" + item_action;
					self.getApp().getRouter().navigate(path);
				})
				self.$el.find("#side-menu-container").append($el);
			})
		}
	});
});
