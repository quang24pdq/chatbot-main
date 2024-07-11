define(function (require) {
	"use strict";
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');

	var template = require('text!./tpl/select.html');
	// scheme = require('json!schema/TenantSchema.json');

	return Gonrin.DialogView.extend({
		template: template,
		//modelSchema	: schema,
		//urlPrefix: "/api/v1/",
		//collectionName: "tenant",
		tools: null,
		render: function () {
			var self = this;
			var selected = [];
			$.each(self.viewData.tenants, function (idx, obj) {
				if (obj.id == self.viewData.current_tenant_id) {
					selected.push({
						"id": obj.id,
						"tenant_name": obj.tenant_name
					})
				}
			});

			console.log("TENANTS: ", self.viewData.tenants);
			self.$el.find("#tenants_grid").grid({
				orderByMode: "client",
				fields: [
					// { field: "id", label: "ID", sortable: { order: "asc" } },
					{
						field: "tenant_name",
						label: LANG.BRAND_NAME,
						//template: '<a href="http://abc.com/{{ id }}"><img src="http://img.abc.com/{{ id }}"><span>{{ name }}</span></a></span>',
					},
				],
				dataSource: self.viewData.tenants,
				primaryField: "id",
				selectionMode: "single",
				// selectedItems: selected,
				pagination: {
					page: 1,
					pageSize: 100
				},
				onRowClick: function (e) {
					self.setCurrentTenant(e.rowId);
					self.close();
				}
			});
		},
		setCurrentTenant: function (tenant_id) {
			var self = this;
			var data = JSON.stringify({
				"tenant_id": tenant_id
			});
			loader.show();
			$.ajax({
				url: self.getApp().serviceURL + '/api/v1/set_current_tenant',
				dataType: "json",
				method: "POST",
				data: data,
				success: function (data) {
					if (!!self.getApp().currentUser) {
						self.getApp().currentUser.current_tenant_id = tenant_id;
					}
					var current_params = self.getApp().router.currentRoute();
					if (current_params["fragment"] === "index") {
						self.getApp().router.refresh();
					} else {
						self.getApp().router.navigate("index");
					}
					loader.saved();
				},
				error: function (XMLHttpRequest, textStatus, errorThrown) {
					loader.error();
				}
			});
		}
	});

});
