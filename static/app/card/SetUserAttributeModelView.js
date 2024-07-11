define(function (require) {
    "use strict";
    var self = this;
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');

    var template = require('text!./tpl/set-user-attribute.html');
    var fieldTemplate = require("text!./tpl/item-set-user-attribute.html");

    var schema = {
        "_id": {
            "type": "string",
            "primary": true
        },
        "fields": {
            "type": "list"
        },
        "bot_id": {
            "type": "string"
        },
        "block_id": {
            "type": "string"
        }
    };

    var fieldSchema = {
        "attribute": {
            "type": "string" // attribute
        },
        "value": {
            "type": "string" // type of validate
        },
    };


    var FieldView = Gonrin.ModelView.extend({
        modelSchema: fieldSchema,
        template: "",
        uiControl: {
            fields: [
                {
                    field: "attribute",
                    uicontrol: "combobox",
//                    textField: "text",
//                    valueField: "value",
                    dataSource: [
//                        { "value": "phone", "text": "phone" },
//                        { "value": "number", "text": "number" },
//                        { "value": "email", "text": "email" },
//                        { "value": "none", "text": "none" },
                    ],
                },
            ]
        },
        
        render: function () {
            var self = this;
            var translatedTemplate = gonrin.template(fieldTemplate)(LANG);
            self.$el.html(translatedTemplate);
            if (this.viewData) {
				var position = lodash.get(this.viewData, 'position', 0);
				self.$el.find("#position").html(position ? position : 0)
			}
            var id = self.model.get("id");
            if (!id) {
                self.model.set("id", gonrin.uuid())
            }
            var attributes = this.getApp().data("attributes");
			self.uiControl.fields[0].dataSource = attributes;
            self.applyBindings();

            self.model.on("change", function () {
                self.trigger("change", {
                    "oldData": self.model.previousAttributes(),
                    "data": self.model.toJSON()
                });
            });
        },
    });

    return Gonrin.ModelView.extend({
        modelIdAttribute: "_id",
        template: null,
        modelSchema: schema,
        urlPrefix: "/api/v1/",
        collectionName: "card",
        uiControl: {
            fields: [
            ]
        },
        render: function () {
            var self = this;
            var translatedTemplate = gonrin.template(template)(LANG);
            self.$el.html(translatedTemplate);
            self.applyBindings();

            self.$el.attr("block-id", self.model.get("_id"));
            self.$el.unbind("click").bind("click", function () {
                self.trigger("block-selected", self.model.get("_id"));
            });

            var fields = self.model.get("fields");
            if (!!fields && (fields.length > 0)) {
                for (var i = 0; i < fields.length; i++) {
                    self.renderField(fields[i]);
                }
            }


            self.$el.find("#add_field").unbind("click").bind("click", function () {
                var data = Gonrin.getDefaultModel(fieldSchema);
                delete data["id"];
                self.model.get("fields").push(data);
                self.renderField(data);
            });
            // init with a field
            if (!fields || fields.length == 0) {
                self.$el.find("#add_field").trigger("click");
            }

            //delete
            self.$el.find("#delete_card").unbind("click").bind("click", function ($event) {
				self.trigger("delete_card", self.model.toJSON());
				self.remove();
			});
            
            self.$el.find("#up_card_position").unbind("click").bind("click", function ($event) {
				self.trigger("change_card_position", {
					"data": self.model.toJSON(),
					"action": "up"
				});
			});
			
			self.$el.find("#down_card_position").unbind("click").bind("click", function ($event) {
				self.trigger("change_card_position", {
					"data": self.model.toJSON(),
					"action": "down"
				});
			});
        },

        renderField: function (data) {
            var self = this;

            var view = new FieldView();
            view.model.set(data);
            view.render();
            self.$el.find("#field-container").append(view.$el);
            view.$el.find("button.close").unbind('click').bind('click',{obj:data}, function(e){
            	var fields = self.model.get("fields");
            	var data = e.data.obj;
                for( var i = 0; i < fields.length; i++){ 
                	   if ( fields[i].value === data.value 
                			   && fields[i].attribute === data.attribute) {
                		   fields.splice(i, 1); 
                	   }
                	}
                self.model.set("fields", fields);
                self.model.trigger("change");
                view.destroy();
                view.remove();
            });
            view.on("change", function (event) {
                var fields = self.model.get("fields");
                fields.forEach(function (item, idx) {
                    delete event.oldData["id"];
                    delete event.data["id"];
                    if (_.isEqual(fields[idx], event.oldData)) {
                        fields[idx] = event.data;
                    }
                });
                self.model.set("fields", fields);
                self.model.trigger("change");
            });
        },
    });

});