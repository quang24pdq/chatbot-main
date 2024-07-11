import importlib
import time
import ujson
from bson.objectid import ObjectId
from gatco.response import json, text, html
from application.extensions import apimanager
from application.client import HTTPClient
from application.database import motordb, logdb
from application.server import app
from application.bot import UpBot
from application.controllers.base import verify_access_token
from application.common.helpers import now_timestamp
from application.controllers.facebook.contact import set_last_sent_contact, set_unreachable_contact
from application.controllers.facebook.message.messaging_session import record_messaging_session


# MAKE MESSAGE LOG AND CHECK DUPLICATE
async def check_processed_message(bot_info, message, contact):
    message_id = message.get("message", {}).get('mid', None)
    if message_id is not None:
        duplicated_message = await logdb.db['message_log'].find_one({'_id': message_id, "message_type": "verify_duplicated_message"})
        if duplicated_message is None:
            messaging_time = now_timestamp()
            duplicated_message = {
                "_id": message_id,
                "sender_id": str(bot_info.get('_id')),
                "recipient_id": contact.get('id'),
                "contact_id": contact.get("id"),
                "contact_name": contact.get("name"),
                "message": message.get("message", {}),
                "message_type": "verify_duplicated_message",
                "create_at": messaging_time,
                "bot_id": str(bot_info.get('_id')),
                "page_id": bot_info.get('page_id', None),
                "tenant_id": bot_info.get('tenant_id', None)
            }
            await record_messaging_session(bot_info, contact, messaging_time, 'message')
            await logdb.db['message_log'].insert_one(duplicated_message)

            return False
    return True


# TYPE: read, message, postback, referral
async def create_message_log(bot, sender, recipient, message):
    bot_id = str(bot.bot_id)
    page_id = message.get('id')
    sender_id = sender.get('id')
    recipient_id = recipient.get('id')

    target = None
    time = now_timestamp()
    if 'read' not in message:
        message_type = None
        if 'referral' in message:
            message_type = 'referral'
            target = message['referral'].get('source')
        elif 'postback' in message:
            if 'referral' in message['postback']:
                message_type = 'postback.referral'
                target = message['postback']['referral'].get('source')
            else:
                message_type = 'postback.payload'
                target = message['postback'].get('payload')
        elif 'message' in message:
            message_type = 'message'

        message = {
            "sender_id": sender_id,
            "recipient_id": recipient_id,
            "messaging_type": message_type,
            "target": target,
            "create_at": time,
            "timestamp": message.get('timestamp'),
            "message": message,
            "result": None,
            "page_id": page_id,
            "bot_id": str(bot_id)
        }
        result = await logdb.db['message_log'].insert_one(message)
        return result.inserted_id
    else:
        # Watermark: All messages that were sent before or at this timestamp were read
        wartermark = {
            "sender_id": sender_id,
            "recipient_id": recipient_id,
            "messaging_type": "read",
            "target": target,
            "create_at": time,
            "timestamp": message.get('timestamp'),
            "message": message,
            "result": None,
            "page_id": page_id,
            "bot_id": str(bot_id)
        }
        result = await logdb.db['message_log'].insert_one(wartermark)
        return result.inserted_id


async def broadcast_check_sent_message(broadcast_id, contact):
    if contact is not None and 'id' in contact:
        return True

    return False


async def broadcast_log_message(bot_id, broadcast_id, contact, content, result=None):
    try:
        if contact is not None and 'id' in contact:
            # if message is None:
            message = {
                'bot_id': bot_id,
                'broadcast_id': broadcast_id,
                'content': content,
                'to': {
                    '_id': str(contact['_id']),
                    'page_scoped_id': contact['id'],
                    'name': contact['name'] if 'name' in contact else ''
                },
                'result': None
            }
            if result is not None:
                message['result'] = result

            await logdb.db['message_log'].insert_one(message)
    except:
        pass


@app.route('/api/v1/message/send', methods=['POST'])
async def send_message(request):

    data = request.json
    page_id = data.get('page_id', None)
    page_scoped_id = data.get('psid', None)
    content = data.get('content', None)

    if page_id is None or page_scoped_id is None or content is None:
        return json({
            'error_code': 'PARAMS_ERROR',
            'error_messgae': "Params error"
        })

    bot_info = await motordb.db['bot'].find_one({'page_id': page_id, 'active': True, 'subscribed': True})

    if bot_info is None:
        return json({
            'error_code': 'BOT_ERROR',
            'error_messgae': "Bot is not exist"
        })

    bot = UpBot(str(bot_info['_id']), bot_info['token'], api_version=app.config.get('FACEBOOK_API_VERSION', 3.2))

    block_id = content.get('block_id', None)
    messaging_type = content.get('messaging_type', None)

    if block_id is None and messaging_type == 'text':
        # SEND MESSAGE BY TEXT
        # {
        #     "messaging_type": "text",
        #     "recipient": {
        #         "id": page_scoped_id
        #     },
        #     "message": {
        #         "text": "hello, world!"
        #     }
        # }
        text = content.get('text', None)
        if text is not None:
            now = now_timestamp()
            result = bot.send_text_message(page_scoped_id, text)
            # SEND MESSAGE BASE ON A FLOW
            contact = await motordb.db['contact'].find_one({'id': page_scoped_id})
            contact['reachable'] = False
            contact['last_sent'] = now
            contact['updated_at'] = now
            await motordb.db['contact'].update_one({'_id': ObjectId(contact.get('_id'))}, {'$set': contact})
            message_log = {
                "create_at": now,
                "contact_id": page_scoped_id,
                "contact_name": contact.get('name', None),
                "messaging_type": "broadcast",
                "message": content,
                "result": result,
                "block_id": None,
                "page_id": page_id,
                "bot_id": str(bot_info['_id'])
            }
            await logdb.db['message_log'].insert_one(message_log)

    elif block_id is not None:
        # SEND MESSAGE BASE ON A FLOW
        contact = await motordb.db['contact'].find_one({'id': page_scoped_id})
        from application.controllers.facebook.block import handle_block
        await handle_block(bot, contact, {"block_id": block_id, "type": "broadcast"}, 0, 'broadcast_card')
        message_log = {
            "create_at": now_timestamp(),
            "contact_id": page_scoped_id,
            "contact_name": contact.get('name', None),
            "messaging_type": "broadcast_block",
            "message": content,
            "result": None,
            "card_id": None,
            "block_id": block_id,
            "page_id": page_id,
            "bot_id": str(bot_info['_id'])
        }
        await logdb.db['message_log'].insert_one(message_log)

    return json({
        'ok': True
    }, status=200)



@app.route('/api/v1/message/send_multi', methods=['POST'])
async def send_message_multi(request):

    data = request.json
    page_id = data.get('page_id', None)
    page_scoped_id = data.get('psid', None)
    content = data.get('content', None)

    if page_id is None or page_scoped_id is None or content is None:
        return json({
            'error_code': 'PARAMS_ERROR',
            'error_messgae': "Params error"
        })

    bot_info = await motordb.db['bot'].find_one({'page_id': page_id, 'active': True, 'subscribed': True})

    if bot_info is None:
        return json({
            'error_code': 'BOT_ERROR',
            'error_messgae': "Bot is not exist"
        })

    bot = UpBot(str(bot_info['_id']), bot_info['token'], api_version=app.config.get('FACEBOOK_API_VERSION', 3.2))

    block_id = content.get('block_id', None)
    messaging_type = content.get('messaging_type', None)

    if block_id is None and messaging_type == 'text':
        # SEND MESSAGE BY TEXT
        # {
        #     "messaging_type": "text",
        #     "recipient": {
        #         "id": page_scoped_id
        #     },
        #     "message": {
        #         "text": "hello, world!"
        #     }
        # }
        text = content.get('text', None)
        if text is not None:
            now = now_timestamp()
            result = bot.send_text_message(page_scoped_id, text)
            # SEND MESSAGE BASE ON A FLOW
            contact = await motordb.db['contact'].find_one({'id': page_scoped_id})
            contact['reachable'] = False
            contact['last_sent'] = now
            contact['updated_at'] = now
            await motordb.db['contact'].update_one({'_id': ObjectId(contact.get('_id'))}, {'$set': contact})
            message_log = {
                "create_at": now,
                "contact_id": page_scoped_id,
                "contact_name": contact.get('name', None),
                "messaging_type": "broadcast",
                "message": content,
                "result": result,
                "block_id": None,
                "page_id": page_id,
                "bot_id": str(bot_info['_id'])
            }
            await logdb.db['message_log'].insert_one(message_log)

    elif block_id is not None:
        # SEND MESSAGE BASE ON A FLOW
        contact = await motordb.db['contact'].find_one({'id': page_scoped_id})
        from application.controllers.facebook.block import handle_block
        await handle_block(bot, contact, {"block_id": block_id, "type": "broadcast"}, 0, 'broadcast_card')
        message_log = {
            "create_at": now_timestamp(),
            "contact_id": page_scoped_id,
            "contact_name": contact.get('name', None),
            "messaging_type": "broadcast_block",
            "message": content,
            "result": None,
            "card_id": None,
            "block_id": block_id,
            "page_id": page_id,
            "bot_id": str(bot_info['_id'])
        }
        await logdb.db['message_log'].insert_one(message_log)

    return json({
        'ok': True
    }, status=200)



@app.route('api/v1/message/message_creatives', methods=['POST'])
async def create_message_creatives(request):
    # https://graph.facebook.com/v2.11/me/message_creatives?access_token=<PAGE_ACCESS_TOKEN> (POST)

    # BODY
    # "messages": [
    #     {
    #         "dynamic_text": {
    #             "text": "Hi, {first_name}! Here is a message",
    #             "fallback_text": "Hi! Here is a message"
    #         }
    #     }
    # ]
    return


async def send_sponsored_messages(request):
    # AD_ACCOUNT_ID: 2879028182142042 (Upgo Ad Account)

    # https://graph.facebook.com/v2.11/act_<AD_ACCOUNT_ID>/sponsored_message_ads

    # message_creative_id
    # daily_budget
    # bid_amount
    # targeting
    # access_token

    # RETURN on success:
    # {
    #     "ad_group_id": <AD_GROUP_ID>
    #     "broadcast_id": <BROADCAST_ID>
    #     "success": <RESPONSE_STATUS>
    # }
    return


@app.route('/api/v1/message/send_single', methods=['POST'])
async def send_single_message(request):
    body_data = request.json
    if body_data is None:
        return json({
            'error_code': 'NONE_BODY',
            'error_messgae': "Body is not allowed to empty"
        }, status=520)

    tenant_id = body_data.get('tenant_id')
    page_id = body_data.get('page_id')
    recipient_id = body_data.get('recipient_id')
    message = body_data.get('message')

    if page_id is None:
        return json({
            'error_code': 'PARAMS_ERROR',
            'error_messgae': "Params error"
        }, status=520)

    bot_info = await motordb.db['bot'].find_one({'page_id': page_id, 'active': True, 'subscribed': True})

    if bot_info is None:
        return json({
            'error_code': 'BOT_ERROR',
            'error_messgae': "Bot is not exist"
        }, status=520)

    # CONFIRMED_EVENT_UPDATE

    URL = app.config.get("FACEBOOK_GRAPH_URL") + '/' + str(page_id) + '/messages?access_token=' + bot_info['token']

    if 'id' in message:
        del message['id']

    data = {
        "recipient": {
            "id": recipient_id
        },
        "message": None,
        "messaging_type": "MESSAGE_TAG",
        "tag": "CONFIRMED_EVENT_UPDATE"
    }

    if message.get('template_type', None) is None:
        data['message'] = message
    else:
        data['message'] = {
            "attachment": {
                "type":"template",
                "payload": message
            }
        }
    # data = {
    #     "recipient": {
    #         "id": recipient_id
    #     },
    #     "message": {
    #         "attachment": {
    #             "type":"template",
    #             "payload": message
    #         }
    #     },
    #     "messaging_type": "MESSAGE_TAG",
    #     "tag": "CONFIRMED_EVENT_UPDATE"
    # }
    result = await HTTPClient.post(URL, data=data)

    return json(result)



@app.route('/api/v1/message/send_to_contact', methods=['POST'])
async def send_single_message(request):
    body_data = request.json
    if body_data is None:
        return json({
            'error_code': 'INVALID_DATA',
            'error_messgae': "Body is not allowed to empty"
        }, status=520)

    bot_id = body_data.get('bot_id')
    recipient_id = body_data.get('recipient_id')
    message = body_data.get('message')

    if not bot_id or not recipient_id:
        return json({
            'error_code': 'PARAMS_ERROR',
            'error_messgae': "Params error"
        }, status=520)

    bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(bot_id)})
    contact_info = await motordb.db['contact'].find_one({'id': str(recipient_id), 'bot_id': str(bot_id)})

    if bot_info is None or contact_info is None:
        return json({
            'error_code': 'ERROR',
            'error_messgae': "Thông tin không chính xác"
        }, status=520)

    URL = app.config.get("FACEBOOK_GRAPH_URL") + '/' + str(bot_info.get('page_id')) + '/messages?access_token=' + bot_info['token']

    if message is not None and 'id' in message:
        del message['id']
    data = {
        "recipient": {
            "id": contact_info.get('id')
        },
        "message": None,
        "messaging_type": "RESPONSE"
    }

    if message is not None and message.get('text') is not None:
        data['message'] = message
    else:
        # {
        #     "attachment": {
        #     "type": "template",
        #     "payload": {
        #         "template_type": "media",
        #         "elements": [
        #             {
        #             "media_type": "<image|video>",
        #             "url": "<FACEBOOK_URL>"
        #             }
        #         ]
        #     }
        #     }
        # }
        data['message'] = message

    result = await HTTPClient.post(URL, data=data)

    return json(result)



