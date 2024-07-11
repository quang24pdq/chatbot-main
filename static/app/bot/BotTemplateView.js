define(function (require) {
	"use strict";
	var $ = require('jquery'),
		_ = require('underscore'),
		Gonrin = require('gonrin');
    var template = require('text!./tpl/template_view.html');
    var CONSTANTS = require('json!app/common/constants.json');
    var itemSchema = {
        "id": {
            "type": "string",
            "primary": true
        },
        "name": {},
        "icon": {

        },
        "thumbnail": {},
        "description": {},
        "powered_by": {}
    };

    var schema = {
        "templates": {
            "type": "list"
        }
    };

	return Gonrin.ModelView.extend({
		template: '',
		modelSchema: schema,
		render: function () {
            var self = this;
            var tpl = gonrin.template(template)(LANG);
			self.$el.empty();
			self.$el.append(tpl);
            self.applyBindings();
            this.$el.find("copyright .version").html(this.getApp().version);
            this.renderTemplates();
        },
        
        renderTemplates: function() {
            const self = this;
            var botTemplates = CONSTANTS.bot_templates;
            // var botTemplates = [];
            var templateContainerEl = this.$el.find("#template_container");
            templateContainerEl.empty();
            $(`<div class="col-lg-3 col-md-3 col-sm-4 col-xs-12 bot-list-item" id="template_blank_bot">
                <div class="bot-tile" style="background: whitesmoke;">
                    <div style="height: auto; width: 100%;">
                        <div class="image-container" style="padding-bottom: 15px;">
                            <i class="fas fa-plus" style="font-size: 26px;"></i>
                        </div>
                        <div class="text-container">
                            <div class="text-center" style="overflow: hidden; text-overflow: ellipsis; -webkit-box-orient: vertical; display: -webkit-box; -webkit-line-clamp: 3; word-wrap: break-word; word-break: break-word; color: #333;">
                                <div class="ellipsis-300" style="min-width: 100%;">${LANG.BLANK_BOT}</div>
                            </div>
                        </div>
                    </div>
                    <div class="sub-text-container">
                        <div class="text-center" style="overflow: hidden;width: 100%;text-overflow: ellipsis;-webkit-box-orient: vertical;display: -webkit-box;-webkit-line-clamp: 2;word-wrap: break-word;word-break: break-word;padding-top: 10px;">
                            <button class="btn btn-default btn-sm" style="border-radius:15px; padding:5px 15px;font-size:13px;z-index:1; min-width: 80px;">${LANG.CHOOSE}</button>
                        </div>
                    </div>
                </div>
            </div>`).appendTo(templateContainerEl).fadeIn();
            templateContainerEl.find("#template_blank_bot").unbind('click').bind('click', () => {
                // CHOOSE BLANK BOT
                self.getApp().trigger("create_blank_bot");
                spinner.show();
                setTimeout(() => {
                    spinner.hide();
                    self.getApp().getRouter().navigate("index");
                }, 400);
            });

            botTemplates.forEach((template, index) => {
                $(`<div class="col-lg-3 col-md-3 col-sm-4 col-xs-12 bot-list-item" id="template_${template.id}">
                    <div class="bot-tile" style="background: whitesmoke;">
                        <div style="height: auto; width: 100%;">
                            <div class="image-container">
                                <div class="bot-tile-image-container" style="background-image: url(${template.thumbnail})"></div>
                            </div>
                            <div class="text-container">
                                <div class="text-center" style="overflow: hidden; text-overflow: ellipsis; -webkit-box-orient: vertical; display: -webkit-box; -webkit-line-clamp: 3; word-wrap: break-word; word-break: break-word; color: #333;">
                                    <div class="ellipsis-300" style="min-width: 100%;">${LANG.BOT_TEMPLATE[template.id]}</div>
                                </div>
                            </div>
                        </div>
                        <div class="sub-text-container">
                            <div class="text-center" style="overflow: hidden;width: 100%;text-overflow: ellipsis;-webkit-box-orient: vertical;display: -webkit-box;-webkit-line-clamp: 2;word-wrap: break-word;word-break: break-word;padding-top: 10px;">
                                <button class="btn btn-default btn-sm" id="btn-connect" style="border-radius:15px; padding:5px 15px;font-size:13px;z-index:1; min-width: 80px;">${LANG.CHOOSE}</button>
                            </div>
                        </div>
                    </div>
                </div>`).appendTo(templateContainerEl).fadeIn();

                templateContainerEl.find("#template_" + template.id).unbind('click').bind('click', () => {
                    spinner.show();
                    $.ajax({
                        type: "POST",
                        url: self.getApp().serviceURL + '/api/v1/bot/create',
                        data: JSON.stringify({
                            'template': template.id
                        }),
                        success: function() {
                            spinner.hide();
                            self.getApp().getRouter().navigate("index");
                        },
                        error: function(xhr) {
                            spinner.error();
                        },
                    });
                });
            });
        }
	});
});
