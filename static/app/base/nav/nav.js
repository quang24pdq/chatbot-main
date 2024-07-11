define(function (require) {
	"use strict";
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');
	return [
		{
			"collectionName": "index",
			"route": "index",
			"$ref": "app/index/IndexView",
		},
		{
			"collectionName": "index",
			"route": "template/choose",
			"$ref": "app/bot/BotTemplateView",
		},
		{
			"collectionName": "bot",
			"route": "bot/model(/:id)",
			"$ref": "app/bot/ModelView",
		},
		{
			"collectionName": "persistent_menu",
			"route": "persistent_menu",
			"$ref": "app/persistent_Menu/view/collection",
		},
		{
			"type": "view",
			"collectionName": "persistent_menu",
			"route": "persistent_menu/model(/:id)",
			"$ref": "app/persistent_Menu/view/model",
			"visible": false
		},
		{
			"collectionName": "bot",
			"route": "bot/config(/:id)",
			"$ref": "app/bot/ConfigurationModelView",
		}
	];

});


