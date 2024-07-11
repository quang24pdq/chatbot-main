define('jquery', [], function () {
	return jQuery;
});

require.config({
	baseUrl: static_url + '/lib',
	paths: {
		app: '../app',
		schema: '../schema',
		vendor: '../vendor'
	},
	shim: {
		'gonrin': {
			deps: ['underscore', 'jquery', 'backbone'],
			exports: 'Gonrin'
		},
		'backbone': {
			deps: ['underscore', 'jquery'],
			exports: 'Backbone'
		},
		'underscore': {
			exports: '_'
		}
	},
	config: {
		text: {
			useXhr: function (url, protocol, hostname, port) {
				return true;
			}
		}
	}
});
class Loader {
	constructor(element) {
		this.element = element;
	}
	show(content = null) {
		this.element.find(".loader-content").empty();
		this.element.find('.loader .lds-ring').addClass('active');
		if (content) {
			this.element('.loader .lds-ring').find("span").html(content);
		}
	}

	hide() {
		this.element.find('.loader .lds-ring').removeClass('active');
		this.element.find(".loader-content").html(``);
	}

	saved(content = null) {
		this.element.find('.loader .lds-ring').removeClass('active');
		this.element.find(".loader-content").html(`
			<span style="color: #078f07;">Saved</span>
		`);
	}

	error(content = null) {
		this.element.find('.loader .lds-ring').removeClass('active');
		this.element.find(".loader-content").html(`
			<span style="color: red;">${content ? content : 'Error'}</span>
		`);
		setTimeout(() => {
			this.element.find(".loader-content").html(``);
		}, 5000);
	}
}

class Spinner {
	constructor() {
		this.timer = null;
		this.delay = true;
		this.hideFlag = false;
	}
	show(content = null) {
		$('body .preloader').show();
	}
	hide() {
		$('body .preloader').hide();
	}
	error() {
		$('body .preloader').hide();
	}
}
window.spinner = new Spinner();
window.clone = function (obj) {
	return JSON.parse(JSON.stringify(obj));
}

require([
	'jquery',
	'gonrin',
	'app/router',
	'text!app/base/tpl/layout.html',
	'app/tenant/TenantView',
	'i18n!app/nls/app',
	'vendor/lodash/lodash',
	'json!app/nls/en.json',
	'json!app/nls/vi.json'],
	function ($, Gonrin, Router, layout, TenantView, lang, lodash, EN, VI) {
		$.ajaxSetup({
			headers: {
				'content-type': 'application/json',
			}
		});
		window.LANG = VI;
		var app = new Gonrin.Application({
			version: app_version,
			serviceURL: host_url,
			staticURL: static_url,
			imageServiceURL: "https://service.upgo.vn/api/image/upload",
			appname: "UpGO",
			appnamespace: "upstart_vn",
			router: new Router(),
			lang: lang,
			initialize: function () {
				const self = this;
				window.lodash = lodash;
				// (1) CHECK CURRENT USER
				this.getCurrentUser((data) => {
					// console.log("CURRENT USER: ", data);
					// CHECK FACEBOOK LOGIN
					self.initFacebook();
				});
			},

			getCurrentUser: function (callback) {
				var self = this;
				spinner.show();
				$.ajax({
					url: self.serviceURL + '/current_user',
					method: "GET",
					success: function (data) {
						spinner.hide();
						self.currentUser = new Gonrin.User(data);
						if (self.currentUser.config && self.currentUser.config.lang == "EN") {
							window.LANG = EN;
						}
						if (callback) {
							callback(data);
						}
					},
					error: function (xhr, textStatus, errorThrown) {
						spinner.hide();
						self.gotoAccountLogin();
					}
				});
			},

			initFacebook: function () {
				const self = this;

				spinner.show();
				setTimeout(() => {
					window.fbAsyncInit = () => {
						FB.init({
							appId: fb_app_id,
							cookie: true,
							xfbml: true,
							autoLogAppEvents: true,
							version: graph_version
						});
						FB.AppEvents.logPageView();
					};
	
					(function (d, s, id) {
						var js, fjs = d.getElementsByTagName(s)[0];
						if (d.getElementById(id)) { return; }
						js = d.createElement(s); js.id = id;
						js.src = "https://connect.facebook.net/vi_VI/sdk.js";
						fjs.parentNode.insertBefore(js, fjs);
					}(document, 'script', 'facebook-jssdk'));
	
					try {
						(function (d, s, id) {
							var js, fjs = d.getElementsByTagName(s)[0];
							if (d.getElementById(id)) { return; }
							js = d.createElement(s);
							js.id = id;
							js.src = "https://connect.facebook.net/vi_VI/sdk/xfbml.customerchat.js";
							fjs.parentNode.insertBefore(js, fjs);
						}(document, 'script', 'facebook-jssdk1'));
					} catch {}
	
					FB.getLoginStatus(function(response) {
						spinner.hide();
						// console.log("getLoginStatus ", response);
						if (response.status == 'connected') {
							// var user_id_facebook = response.authResponse.userID;
							self.data('accessUserToken', response.authResponse.accessToken);
							// self.getCurrentUser(response.authResponse);
							self.saveUserSessionToken(response.authResponse);
							self.loadAppContent();
						} else {
							$(".facebook-login").removeClass("hide");
						}
					});
				}, 1500);
			},
			
			loadAppContent: function() {
				const self = this;
				var tpl = gonrin.template(layout)(LANG);
				$('#body-content').hide().html(tpl);
				this.$header = $('#body-content').find(".page-header");
				this.$content = $('#body-content').find(".content-area");
				this.$navbar = $('#body-content').find(".page-navbar");
				this.$toolbox = $('#body-content').find(".tools-area");
				// loader register
				window.loader = new Loader(this.$header);
				this.getRouter().registerAppRoute();

				if (!!self.currentUser) {
					$("span.username").html(self.currentUser.display_name);
				}

				$('#body-content').show();
				$('#body-login').hide();

				self.setCurrentTenant();

				$('#switch-tenant').unbind("click").bind("click", function () {
					var tenantSelectView = new TenantView({
						viewData: {
							"tenants": self.currentUser.tenants || [],
							"current_tenant_id": self.currentUser.current_tenant_id || null
						}
					});
					tenantSelectView.dialog();
				});

				$(".page-header").find("#btn_vi").unbind("click").bind("click", function () {
					var user = clone(self.currentUser);
					var config = user.config ? user.config : {};
					config.lang = "VI";
					$.ajax({
						url: self.serviceURL + "/api/v1/user/set-config?id=" + user.id,
						data: JSON.stringify(config),
						type: "PUT",
						success: function (response) {
							location.reload();
						},
						error: function () {
							console.log("ERROR");
						}
					});
				});
				$(".page-header").find("#btn_en").unbind("click").bind("click", function () {
					var user = clone(self.currentUser);
					var config = user.config ? user.config : {};
					config.lang = "EN";
					$.ajax({
						url: self.serviceURL + "/api/v1/user/set-config?id=" + user.id,
						data: JSON.stringify(config),
						type: "PUT",
						success: function (response) {
							location.reload();
						},
						error: function () {
							console.log("ERROR");
						}
					});
				});

				var current_params = self.router.currentRoute();
				if ((current_params["fragment"] === "") || (current_params["fragment"] === "login")) {
					self.router.navigate("index");
				}
				else if (current_params["fragment"] === "index") {
					self.router.refresh();
				}
			},

			saveUserSessionToken(authResponse) {
				const self = this;
				$.ajax({
					type: 'POST',
					url: self.serviceURL + '/api/v1/user/fbauth',
					data: JSON.stringify(authResponse),
					success: function(response) {

					},
					error: function(xhr) {}
				});
			},

			loginFacebook: function(event) {
				FB.getLoginStatus(function (response) {
					// console.log("getLoginStatus ", response);
					if (response && response.status == 'connected') {
						app.data('accessUserToken', response.authResponse.accessToken);
						app.saveUserSessionToken(response.authResponse);
						app.loadAppContent();
					}
				});
			},

			refreshPermission: function() {
				const self = this;

				FB.login(function(response) {
					console.log("<>>>>>> ", response);
					if (response.authResponse) {
						if (response && response.status == 'connected') {
							app.data('accessUserToken', response.authResponse.accessToken);
							app.saveUserSessionToken(response.authResponse);
							window.location.reload();
						}
					} else {
						// User cancelled
					}
				}, { auth_type: 'reauthenticate', auth_nonce: '{random-nonce}'})
			},

			setCurrentTenant: function () {
				var self = this;
				if (!!self.currentUser) {
					$.each(self.currentUser.tenants, function (idx, obj) {
						if (obj.id === self.currentUser.current_tenant_id) {
							$('#switch-tenant').html(LANG.BRAND_NAME + ": " + obj.tenant_name);
						}
					});
				};
			},
			gotoAccountLogin: function () {
				var continueURL = encodeURIComponent('https://bot.upgo.vn');
				window.location.replace("https://account.upgo.vn/#login?continue=" + continueURL);
			}
		});

	});
