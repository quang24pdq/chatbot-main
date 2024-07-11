define(function (require) {

    "use strict";
    
    var $           = require('jquery'),
        Gonrin    	= require('gonrin');
    // var Group       = require('app/Group/CollectionView');
    
    var navdata = require('app/base/nav/nav');
    
    return Gonrin.Router.extend({
        routes: {
    		"index" : "index",
            "login": "login",
            "loginfacebook": "loginfacebook",
            "logout": "logout",
            //"group": "group",
            "error": "error_page",
            "*path":  "defaultRoute",
        },

        index:function() {},

        login: function() {
        	//this.getApp().data("current_so", null);
            // var loginview = new Login({el: $('body')});
            // loginview.render();
        },
        loginfacebook: function() {
            if ($("#body-login").hasClass("hide")) {
                $("#body-login").removeClass("hide");
            }
        },
        logout: function() {
        	var self = this;
        	$.ajax({
				url: self.getApp().serviceURL + '/logout',
       		    dataType:"json",
       		    success: function (data) {
       		    	//self.navigate("login");
       		    	self.getApp().gotoAccountLogin();
       		    },
       		    error: function(XMLHttpRequest, textStatus, errorThrown) {
       		    	self.getApp().notify(self.getApp().translate("LOGOUT_ERROR"));
       		    }
        	});
        },

        defaultRoute:function() {
            console.log("go default router");
        	//this.navigate("index", true);
        },
        
        registerAppRoute: function(){
            var self = this;
            $.each(navdata, function(idx, entry){
                var entry_path = _.result(entry,'route');
                self.route(entry_path, entry.collectionName, function(){
                    require([ entry['$ref'] ], function ( View) {
                        var view = new View({el: self.getApp().$content, viewData:entry.viewData});
                        view.render();
                    });
                });
            });
            Backbone.history.start();
        },
        
        error_page: function() {
        	var app = this.getApp();
        	if(app.$content){
        		app.$content.html("Error Page");
        	}
        	return;
        }
    });

});