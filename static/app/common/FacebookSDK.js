define(function (require) {

    var subscribed_fields = [
        "name",
        "picture",
        "category",
        "description",
        "conversations",
        "feed",
        "messages",
        "message_deliveries",
        "messaging_postbacks",
        "message_reads",
        "messaging_referrals",
        "products",
        "general_info",
        "phone",
        "email",
        "birthday",
        "personal_info",
        "publisher_subscriptions",
        "members"
    ];
    return class FacebookSDK {
        constructor() {  
        };

        static async getSubscribedPage(page_id, token) {
            return new Promise(resolve => {
                FB.api("/" + page_id + "/subscribed_apps", 'get', { access_token: token }, function (response) {
                    var errorType = lodash.get(response, 'error.type', null);
                    if (errorType === 'OAuthException') {
                        resolve({
                            "ok": false,
                            "error": response
                        });
                    } else {
                        var data = lodash.get(response, 'data', []);
                        resolve({
                            "ok": true,
                            "apps": data
                        });
                    }
                });
            });
        }

        static async subscribed(page) {
            return new Promise(resolve => {
                FB.api("/" + page.id + "/subscribed_apps", 'post',
                    { access_token: page.token, subscribed_fields: subscribed_fields },
                    function (response) {
                        var error = lodash.get(response, 'error', null);
                        if (error) {
                            resolve({
                                "ok": false
                            });
                        } else {
                            resolve({
                                "ok": true
                            });
                        }
                    });
            });
        }

        static async unsubscribed(page) {
            return new Promise(resolve => {
                FB.api("/" + page.id + "/subscribed_apps", 'delete',
                    { access_token: page.token },
                    function (response) {
                        if (!response || response.error) {
                            resolve({
                                "ok": false
                            });
                        } else {
                            resolve({
                                "ok": true
                            });
                        }
                    });
            })
        }
    }
});