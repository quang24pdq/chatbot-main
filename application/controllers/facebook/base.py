import json as json_load
import requests
from math import floor
from datetime import datetime
from bson import ObjectId
from application.server import app
from application.database import motordb
from application.common.helpers import now_timestamp



async def subscribe_get_start_button(started_block_id, page_access_token):
    headers = {
        "Content-Type": "application/json"
    }
    if started_block_id is None or started_block_id == "":
        started_block_id = "welcome"

    data = {
        "get_started": {
            "payload": str(started_block_id)
        },
        "whitelisted_domains": [
            "https://upgo.vn",
            "https://bot.upgo.vn",
            "https://crm.upgo.vn",
            "https://site.upgo.vn",
            "https://upstart.vn"
        ]
    }
    url = app.config.get("FACEBOOK_GRAPH_URL") + 'me/messenger_profile?access_token=' + str(page_access_token)
    result = requests.post(url, data=json_load.dumps(data), headers=headers)


async def create_first_block(bot_id):
    block = {
        'bot_id': str(bot_id),
        'name': 'Get Start',
        'type': 'structure',
        'ref_link': {
            "active": False,
            "param": None
        },
        'group_id': None,
        'position': 1,
        'broadcast_options': None,
        "created_at": now_timestamp(),
        "updated_at": now_timestamp(),
        '_id': ObjectId(bot_id)
    }
    check_first_block = await motordb.db['block'].find_one({'_id': ObjectId(bot_id)})
    if check_first_block is None:
        result = await motordb.db['block'].insert_one(block)
        return str(result.inserted_id)
    return bot_id



async def pre_post_set_position(data=None,**kw):  
    if data is not None:
        data["position"] = now_timestamp()
    

async def pre_get_many_order_by(search_params=None, **kw):
    if search_params.get('order_by', None) is None:
        search_params["order_by"] = [{"position": 1}]
