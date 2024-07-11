from bson.objectid import ObjectId
from gatco.response import json
from application.client import HTTPClient
from application.server import app
from application.database import motordb
from application.extensions import apimanager
from application.controllers.base import auth_func
from application.controllers.tenant import set_tenant
from application.common.constants import STATUS_CODE


@app.route("/api/v1/facebook/chat-plugin", methods=["POST", "OPTIONS"])
async def subscribed_chat_plugin(request):

    body_data = request.json
    bot_id = body_data['bot_id'] if 'bot_id' in body_data and body_data['bot_id'] is not None else None
    whitelisted_domains = body_data['whitelisted_domains'] if 'whitelisted_domains' in body_data and isinstance(body_data['whitelisted_domains'], list) else []

    bot_info = await motordb.db['bot'].find_one({"_id": ObjectId(bot_id)})
    token = bot_info['token'] if 'token' in bot_info and bot_info['token'] is not None else ""
    url = app.config.get("FACEBOOK_GRAPH_URL") + "me/messenger_profile?access_token=" + token
    headers = {'Content-Type': 'application/json'}
    data = {
        "whitelisted_domains": whitelisted_domains
    }
    request = await HTTPClient.post(url, data, headers)
    return json({
        "app_id": app.config.get("FB_APP_ID", None),
        "page_id": bot_info['page_id']
    }, status=STATUS_CODE['OK'])


#
# _id:
# plugin_type: "customer_chat",
# whitelisted_domain: [],
# optional: {}
# active: True/False
# bot_id:
# page_id:
# tenant_id:
# 
@app.route("/api/v1/facebook/get-qr-code", methods=["POST"])
async def get_qr_code(request):
    data = request.json
    bot_id = data.get("bot_id", None)
    image_size = data.get("image_size", None)
    ref = data.get("ref", None)
    bot_info = await motordb.db['bot'].find_one({"_id": ObjectId(bot_id)})
    token = bot_info["token"]

    if token is not None:
        url = app.config.get("FACEBOOK_GRAPH_URL") + "me/messenger_codes?access_token=" + token
        headers = {'Content-Type': 'application/json'}
        data = {
            "type": "standard",
            "data": {
                "ref": ref
            },
            "image_size": image_size
        }
        respose = await HTTPClient.post(url, data, headers)

        return json(respose)

    return json({
        'ok': False,
        'error_code': 'ERROR'
    }, status=STATUS_CODE['ERROR'])


apimanager.create_api(collection_name='plugin',
    methods=['GET', 'POST', 'DELETE', 'PUT'],
    url_prefix='/api/v1/facebook',
    preprocess=dict(
        GET_SINGLE=[auth_func],
        GET_MANY=[auth_func],
        POST=[auth_func, set_tenant],
        PUT_SINGLE=[auth_func]
    ),
    postprocess=dict(POST=[], PUT=[])
)