from application.database import motordb, logdb
from bson.objectid import ObjectId
from gatco_restapi.helpers import to_dict
from application.common.helpers import handle_argument
from application.common.helpers import now_timestamp, merge_objects
from application.controllers.facebook.card.button import handle_buttons
from application.controllers.facebook.contact import set_last_sent_contact, set_unreachable_contact
from application.controllers.facebook.message.messaging_session import get_session_detection
from application.controllers.integration.upstart_chatinfo import ChatInfoHandlerFactory, ChatInfoHandlerType

async def card_handler(card, bot, contact, block_id, messaging_type='message'):
    
    bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(bot.bot_id)})
    session_ai_detection = await get_session_detection(bot_info['page_id'], contact, None)

    elements = {}
    if (card.get('title', None) is not None and card.get("title") != ''):
        elements['title'] = card['title']
    
    if (card.get('subtitle', None) is not None and card.get("subtitle") != ''):
        subtitle = card['subtitle']
        if (subtitle.find("{{") >= 0 and subtitle.find("}}") >= 0):
            try:
                datasource = merge_objects(session_ai_detection, contact, False)
                subtitle = handle_argument(subtitle, datasource)
            except:
                print("generic_card.card_handler   can not parser generic card==============================", subtitle)

        elements['subtitle'] = subtitle
    else:
        elements['subtitle'] = ''

    if (card.get("image_url") is not None):
        elements['image_url'] = card['image_url']

    if (card.get("buttons") and await handle_buttons(card.get("buttons")) is not None):
        buttons = card.get("buttons")
        payloads = await handle_buttons(buttons)

        elements['buttons'] = payloads

    if card.get('default_url', None) is not None:
        default_action = {
            "type": "web_url",
            "url": card['default_url'],
            "messenger_extensions": False,
            "webview_height_ratio": "tall",
            "fallback_url": None
        }
        elements['default_action'] = default_action

    result = bot.send_generic_message(contact["id"], [elements])
    if result.get('error', None) is not None:
        contact = await set_unreachable_contact(contact, str(bot_info.get('_id', '')))
    else:
        contact = await set_last_sent_contact(contact)

    message_log = {
        "sender_id": str(bot_info.get('_id', '')),
        "recipient_id": contact.get('id', None),
        "create_at": now_timestamp(),
        "contact_id": contact.get('id', None),
        "contact_name": contact.get('name', None),
        "messaging_type": messaging_type,
        "message": [elements],
        "result": result,
        "card_id": str(card['_id']),
        "block_id": block_id,
        "page_id": bot_info.get('page_id', None),
        "bot_id": str(bot_info.get('_id', ''))
    }
    await logdb.db['message_log'].insert_one(message_log)
    await send_to_chatinfo(message_log)
    return None


async def create_message_broadcast(card):

    message = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": []
            }
        }
    }

    elements = {}
    if (card.get('title', None) is not None and card.get("title") != ''):
        elements['title'] = card['title']
    
    if (card.get('subtitle', None) is not None and card.get("subtitle") != ''):
        subtitle = card['subtitle']
        if (subtitle.find("{{") >= 0 and subtitle.find("}}") >= 0):
            try:
                datasource = merge_objects(session_ai_detection, contact, False)
                subtitle = handle_argument(subtitle, datasource)
            except:
                print("generic_card.card_handler   can not parser generic card==============================", subtitle)

        elements['subtitle'] = subtitle
    else:
        elements['subtitle'] = ''

    if (card.get("image_url") is not None):
        elements['image_url'] = card['image_url']

    if (card.get("buttons") and await handle_buttons(card.get("buttons")) is not None):
        buttons = card.get("buttons")
        payloads = await handle_buttons(buttons)

        elements['buttons'] = payloads

    if card.get('default_url', None) is not None:
        default_action = {
            "type": "web_url",
            "url": card['default_url'],
            "messenger_extensions": False,
            "webview_height_ratio": "tall",
            "fallback_url": None
        }
        elements['default_action'] = default_action

    message['attachment']['payload']['elements'] = [elements]

    return message

async def send_to_chatinfo(message):
    sender = ChatInfoHandlerFactory.get_hander(
        hander_type = ChatInfoHandlerType.CHATBOT_TO_CONTACT)()
    sender.send_message(message)