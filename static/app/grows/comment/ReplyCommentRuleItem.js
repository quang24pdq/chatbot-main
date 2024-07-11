define(function (require) {
    "use strict";
    var self = this;
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');

    var template = require('text!./tpl/reply_comment_rule_item.html');
    var schema = {
        '_id': {
            'type': 'string'
        },
        'entity': {
            'type': 'string'
        },
        'intents': {
            'type': 'string'
        },
        'text': {
            'type': 'list'
        },
        'reply': {
            'type': 'dict'
        },
        'default': {
            'type': 'boolean'
        }
    };


    return Gonrin.ModelView.extend({
        template: '',
        modelSchema: schema,
        urlPrefix: "/api/v1/",
        collectionName: "feed_item",
        uiControl: {
            fields: [
                {
                    field: "intents",
                    uicontrol: "combobox",
                    textField: "label",
                    valueField: "name",
                    dataSource: [],
                },
            ],
            refresh: true
        },

        render: function () {
            var self = this;
            var translatedTemplate = gonrin.template(template)(LANG);
            self.$el.html(translatedTemplate);
            var intents = lodash.get(this.viewData, 'intents', []);
            self.uiControl.fields[0].dataSource = intents;
            self.applyBindings();

            if (this.model.get('default')) {
                self.$el.find("#ai_field").hide();
                self.$el.find("#words_field").hide();
                self.$el.find("#reply_field").attr('class', 'col-lg-12 col-sm-12');
                self.$el.find("#reply_field textarea").attr('placeholder', LANG.GROW_COMMENT_RULE_PLACEHOLDER_DEFAULT);
            }

            var reply = this.model.get('reply') ? this.model.get('reply') : {};
            var message = lodash.get(reply, 'message', '');
            if (message) {
                self.$el.find("#reply_message").val(message);
            }
            self.$el.find("#reply_message").unbind("change").bind("change", function (event) {
                var value = event.target.value;
                var reply = self.model.get('reply') ? self.model.get('reply') : {};
                reply.message = value;

                self.model.set('reply', reply);
            });

            self.newUiControl();

            self.model.on("change", function () {
                self.trigger('change', self.model.toJSON());
            });

            self.$el.find("#btn-delele-rule").unbind("click").bind("click", function () {
                //delete rule view
                $.confirm({
                    title: 'Confirm!',
                    content: 'Are your sure?',
                    buttons: {
                        delete: {
                            btnClass: "btn-danger",
                            action: function () {
                                if (self.model.get('default') == true) {
                                    self.model.set('intents', null);
                                    self.model.set('entity', null);
                                    self.model.set('text', []);
                                    self.$el.find("#reply_message").val('');
                                    self.model.set('reply', { 'message': '' });
                                } else {
                                    self.trigger("delete", self.model.get('_id'));
                                    self.remove();
                                }
                            }
                        },
                        cancel: function () {
                        }
                    }
                });
            })
        },

        dataRender: function (data = []) {
            var self = this;
            self.$el.find("#" + self.model.get("_id") + "-list-data").html("");
            if (!data) {
                data = [];
            }
            data.forEach(function (item, index) {
                self.$el.find("#" + self.model.get("_id") + "-list-data").append(`
                    <div class="word">
                    ${item}
                    <span id="${self.model.get("_id")}-${index}-del" class="glyphicon glyphicon-remove del-word"></span>
                    </div>
                `);
            });
            // wait 0.2s for loading element
            var timer = setTimeout(function () {
                data.forEach(function (rule, index) {
                    $("#" + self.model.get("_id") + "-" + index + "-del").unbind("click").bind("click", function () {
                        data.splice(index, 1);
                        self.model.set("text", data);
                        self.dataRender(self.model.get("text"));
                        self.model.trigger('change', self.model);
                    })
                })
                clearTimeout(timer);
            }, 200)
        },

        newUiControl: function () {
            var self = this;
            self.$el.find("input[name='typing']").attr("id", self.model.get("_id") + "-typing");
            self.$el.find("div[name='list-data']").attr("id", self.model.get("_id") + "-list-data");
            self.$el.find("#" + self.model.get("_id") + "-typing").keypress(function ($event) {
                if ($event.which == 13) {
                    $event.preventDefault();
                    if ($event.target.value) {
                        var modelData = self.model.get("text");
                        modelData.push($event.target.value);
                        self.model.set("text", modelData);
                        self.dataRender(self.model.get("text"));
                        self.$el.find("#" + self.model.get("_id") + "-typing").val("");
                        self.model.trigger('change', self.model);
                    }
                }
            });

            self.dataRender(self.model.get("text"));
        }
    })
})
