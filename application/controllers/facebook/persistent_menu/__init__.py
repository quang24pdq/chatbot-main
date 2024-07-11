
import requests, uuid, ujson
from copy import deepcopy
from bson.objectid import ObjectId
from application.extensions import apimanager
from gatco.response import json, text, html
from application.server import app
from application.database import motordb
from application.client import HTTPClient
from application.common.helpers import now_timestamp
from application.controllers.base import auth_func
from application.controllers.tenant import set_tenant, get_current_tenant_id
from application.controllers.facebook.card.button import handle_buttons, handle_messenger_buttons
from application.common.constants import DEFAULT_PERSISTENT_MENU


async def create_default_persistent_menu(bot_id):

    persistent_menu = {
        'bot_id': bot_id,
        'buttons': [],
        "active": True,
        "created_at": now_timestamp(),
        "updated_at": now_timestamp()
    }

    result = None
    for menu in DEFAULT_PERSISTENT_MENU:
        persistent_menu['composer_input_disabled'] = menu.get('composer_input_disabled', False)
        persistent_menu['locale'] = menu.get('locale', 'default')

        for button in menu.get('call_to_actions', []):

            if button.get('type') == 'blocks' or button.get('type') == 'postback':
                block_info = await motordb.db['block'].find_one({'bot_id': bot_id, 'payload': button.get('payload')})
                blocks = []
                if block_info is not None:
                    blocks = [{
                        "_id": str(block_info.get('_id')),
                        "name": block_info.get('name'),
                        "payload": block_info.get('payload')
                    }]
                persistent_menu['buttons'].append({
                    "_id": str(now_timestamp()),
                    "type": button.get('type'),
                    "webview_height_ratio": None,
                    "title": button.get('title'),
                    "blocks": blocks,
                    "url": None
                })
            else:
                persistent_menu['buttons'].append({
                    "_id": str(now_timestamp()),
                    "type": button.get('type'),
                    "webview_height_ratio": button.get('webview_height_ratio', None),
                    "title": button.get('title'),
                    "blocks": None,
                    "url": button.get('url')
                })
        result = await motordb.db['persistent_menu'].insert_one(persistent_menu)

    persistent_menu['_id'] = str(result.inserted_id)

    return persistent_menu



async def subcribe_persistent_menu(bot_info):
    if bot_info is None:
        return

    tenant_id = bot_info.get('tenant_id')
    bot_id = str(bot_info.get('_id'))

    persistent_menu = await motordb.db['persistent_menu'].find_one({'bot_id': bot_id})
    if persistent_menu is None:
        # CREATE DEFAULT PERSISTENT MENU
        persistent_menu = await create_default_persistent_menu(bot_id)

    if persistent_menu is not None:

        call_to_action = handle_messenger_buttons(bot_info, persistent_menu.get('buttons', []))
        if call_to_action is None:
            call_to_action = []
        payload = {
            "persistent_menu": [
                {
                    "locale": "default",
                    "composer_input_disabled": False,
                    "call_to_actions": call_to_action
                }
            ]
        }
        headers = {
            "Content-Type": "application/json",
        }
        data  = {
            "start_date": "2020-01-01T00:00:00+07:00",
            "conf": {
                "tenant_id": tenant_id,
                "bot_id": bot_id
            }
        }
        await HTTPClient.post(app.config.get('UPGO_AIRFLOW_LOCAL_URL') + "/api/experimental/dags/subscribe_persistent_menu/dag_runs", data=data, headers=headers)




apimanager.create_api(collection_name='persistent_menu',
    methods=['GET', 'POST', 'DELETE', 'PUT'],
    url_prefix='/api/v1',
    preprocess=dict(
        GET_SINGLE=[auth_func],
        GET_MANY=[auth_func],
        POST=[auth_func, set_tenant],
        PUT_SINGLE=[auth_func]
    ),
    postprocess=dict(POST=[])
)



@app.route("/api/v1/persistent_menu/apply")
async def apply_persistent_menu(request):
    tenant_id = get_current_tenant_id(request)
    bot_id = request.args.get('bot_id')

    headers = {
        'Content-Type': 'application/json'
    }
    data  = {
        "start_date": "2020-01-01T00:00:00+07:00",
        "conf": {
            "tenant_id": tenant_id,
            "bot_id": bot_id
        }
    }
    await HTTPClient.post(app.config.get('UPGO_AIRFLOW_LOCAL_URL') + "/api/experimental/dags/subscribe_persistent_menu/dag_runs", data=data, headers=headers)

    return json({
        "ok": True
    })


# This will override the current page level settings for this user.
@app.route('/api/v1/persistent_menu/custom_user_settings', methods=['POST'])
async def subscribe_persistent_menu_user_level(request):

    body_data = request.json
    if body_data is None:
        return json({
            "error_code": "INVALID_REQUEST",
            "error_message": "BODY DATA IS INVALID"
        })

    tenant_id = body_data.get('tenant_id')
    bot_id = body_data.get('bot_id')
    if bot_id is None:
        return json({
            'error_code': 'INVALID_REQUEST',
            'error_message': 'Unknown BOT'
        })

    bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(bot_id), 'tenant_id': tenant_id})

    if bot_info is None:
        return json({
            "error_code": "NOT_FOUND",
            "error_message": "BOT IS NOT FOUND"
        })

    persistent_menu = await motordb.db['persistent_menu'].find_one({'bot_id': str(bot_id)})
    if persistent_menu is None or persistent_menu.get('buttons') is None or isinstance(persistent_menu.get('buttons'), list) != True:
        return json({
            "error_code": "NOT_FOUND",
            "error_message": "PERSISTENT MENU IS NOT FOUND"
        })

    buttons = persistent_menu.get('buttons')

    call_to_action = handle_messenger_buttons(bot_info, buttons)

    headers = {
        "Content-Type": "application/json",
    }
    URL = app.config.get('FACEBOOK_GRAPH_URL') + "/me/custom_user_settings?access_token=" + str(bot_info.get("token"))
    data = {
        "psid": body_data.get('psid'),
        "persistent_menu": [
            {
                "locale": "default",
                "composer_input_disabled": False,
                "call_to_actions": call_to_action
            }
        ]
    }

    response = requests.post(URL, ujson.dumps(data), headers=headers)

    if response.status_code == 200:
        return json({
            "ok": True
        })
    return json({
        "ok": False
    })