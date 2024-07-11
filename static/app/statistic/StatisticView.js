define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        Gonrin = require('gonrin');
    var template = require('text!./tpl/statistic.html');
    var schema = {};

    var Helper = require("app/common/Helpers");

    return Gonrin.ModelView.extend({
        bindings: "statistic-bind",
        template: null,
        modelSchema: schema,
        urlPrefix: "/api/v1/",
        collectionName: "statistic",
        contactLineTimeChart: null,

        render: function () {
            var self = this;
            var translatedTemplate = gonrin.template(template)(LANG);
            self.$el.html(translatedTemplate);
            var bot_id = this.getApp().getRouter().getParam("id");
            self.renderChart();
            self.loadChartData();
        },

        registerEvents: function () {
            var self = this;
        },

        renderChart: function () {
            const self = this;

        },

        loadChartData: function () {
            const self = this;
            var bot_id = this.getApp().getRouter().getParam("id");
            var endOfToday = new Date();
            endOfToday.setHours(23, 59, 59, 999);
            var endOfTodayTimestamp = Helper.localToTimestamp(endOfToday);
            var startTodayTimestamp = endOfTodayTimestamp - 84600000;
            $.ajax({
                url: self.getApp().serviceURL + '/api/v1/statistic/total_user_time_line',
                data: {
                    'bot_id': bot_id,
                    'from': startTodayTimestamp,
                    'to': endOfTodayTimestamp
                },
                type: 'GET',
                success: function (response) {
                    // self.contactLineTimeChart.load({
                    //     json: response
                    // });
                    var chart = c3.generate({
                        bindto: "#total_user_time_line",
                        data: {
                            json: response,
                            keys: {
                                x: 'date', // it's possible to specify 'x' when category axis
                                value: ['total'],
                            },
                            names: {
                                'total': 'Tổng số khách'
                            },
                            type: 'spline',
                            types: {
                                total: 'area'
                            },
                            labels: {
                                format: function (v, id, i, j) { return v; }
                            }
                        },
                        legend: {
                            show: false
                        },
                        axis: {
                            x: {
                                type: 'category'
                            },
                            y: {
                                tick: {
                                    format: function (d) {
                                        var val = '';
                                        if (d >= 0 && d < 1000) {
                                            val = d;
                                        } else if (d >= 1000 && d < 1000000) {
                                            val = String(d / 1000) + "K";
                                        } else if (d >= 1000000 && d < 1000000000) {
                                            val = String(d / 1000000) + "M";
                                        } else {
                                            val = String(d / 1000000000) + "B";
                                        }
                                        return val;
                                    }
                                }
                            }
                        }
                    });
                },
                error: function (xhr) { }
            });

        }
    });

});