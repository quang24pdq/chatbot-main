// define(function (require) {
// 	"use strict";
// 	var $ = require('jquery'),
// 		_ = require('underscore'),
// 		Gonrin = require('gonrin');

// 	var template = require('text!./tpl/collection.html'),
// 		schema = require('json!schema/BotSchema.json');
// 	var TemplateHelper = require('app/common/TemplateHelper');

// 	return Gonrin.CollectionView.extend({
// 		template: template,
// 		modelSchema: schema,
// 		urlPrefix: "/api/v1/",
// 		collectionName: "bot",
// 		uiControl: {
// 			orderBy: [{ field: "created_at", direction: "desc" }],
// 			fields: [
// 				{ field: "name", label: "Name" },
// 			],
// 			onRowClick: function (event) {
// 				console.log(event.rowData._id)
// 				if (event.rowData._id) {
// 					var path = this.collectionName + '/model?id=' + event.rowData._id;
// 					this.getApp().getRouter().navigate(path);
// 				}
// 			}
// 		},
// 		render: function () {
// 			this.collection.parse = function (resp) {
// 				return resp;
// 			}
// 			this.applyBindings();
// 			return this;
// 		}
// 	});

// });
