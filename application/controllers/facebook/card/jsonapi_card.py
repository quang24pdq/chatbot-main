import ujson, requests
from bson import json_util
from bson.objectid import ObjectId
from urllib.parse import urlparse, parse_qs, urlsplit
from gatco.response import json, text, html
from application.server import app
from application.database import motordb
from application.client import HTTPClient
from application.common.constants import tenant_headers
from application.controllers.facebook import check_token_expire

ACCESS_TOKEN = "MhZBy93zMUa5UwpLB3G2qYxFNSAdZpvCwk1UhUhREfMmB1W0SsR8eeDRV1VKggaBo1jtLrbeuNqWDaKlsrkwuLefDXNH1O8dDiwfxxhP9vBCwaLOrT9JvbOWWstN4sQv"


async def card_handler(card, bot, contact, block_id, messaging_type='message'):
    if card and card is not None:
        attributes = card.get("attributes")
        default_attrs = ["id", "page_id", "page_name", "name", "first_name", "last_name", "client_mac"]
        if contact is None:
            return None
        else:
            bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(bot.bot_id)})
            contact = await motordb.db['contact'].find_one({'bot_id': bot.bot_id, 'id': contact['id']})
            data = {}
            attrs = default_attrs
            if attributes is None or not isinstance(attributes, list):
                attributes = []

            for attr in attributes:
                if attr not in attrs:
                    attrs.append(attr)

            for idx, attr in enumerate(attrs):
                if attr in contact and contact.get(attr, None) is not None:
                    data[attr] = contact.get(attr, None)

                else:
                    if attr is not None and attr.strip() != "":
                        data[attr] = None

            url = card.get("url")
            if url is None:
                return None

            request_method = card.get("type_method")
            headers = {
                "X-Auth-Token": "security-token",
                "ACCESS_TOKEN": ACCESS_TOKEN
            }

            data['id'] = contact.get('id')
            data['tenant_id'] = bot_info.get('tenant_id')
            data['page_id'] = bot_info.get('page_id')
            data['page_name'] = bot_info.get('page_name')
            data['page_logo'] = bot_info.get("page_logo")

            response = None
            if request_method == "GET":
                response = requests.get(url, params=data, headers=headers)
            elif request_method == "POST":
                response = requests.post(url, json=data, headers=headers)
            else:
                return None    

            if response is not None and response.status_code == 200:
                result = response.json()
                if result is not None and result.get('contact_id') is not None:
                    await motordb.db['contact'].update_one({'_id': ObjectId(contact['_id'])}, {'$set': {'contact_id': result['contact_id']}})

                if result is not None and "messages" in result:
                    for message in result["messages"]:
                        send_result = bot.send_message(contact["id"], message)

    return None
