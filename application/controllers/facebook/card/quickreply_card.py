from application.server import app
from application.database import motordb, logdb
from datetime import datetime
import ujson
import time
from copy import deepcopy
from bson.objectid import ObjectId
from application.common.helpers import handle_argument
from application.common.helpers import now_timestamp, merge_objects
from application.controllers.facebook import check_token_expire
from application.controllers.facebook.contact import set_last_sent_contact, set_unreachable_contact
from application.controllers.facebook.contact.current_input import update_current_contactinputs
from application.controllers.facebook.message.messaging_session import get_session_detection
from application.controllers.integration.upstart_chatinfo import ChatInfoHandlerFactory, ChatInfoHandlerType

# quick replies


async def card_handler(card, bot, contact, block_id, messaging_type='message'):
    text = card.get("text", None)
    if text is not None:
        bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(bot.bot_id)})
        session_ai_detection = await get_session_detection(bot_info['page_id'], contact, None)

        if text.find("{{") >= 0 and text.find("}}") >= 0:
            sourceData = merge_objects({
                'page_id': bot_info.get('page_id', ''),
                'page_name': bot_info.get('page_name', ''),
            }, contact)
            datasource = merge_objects(session_ai_detection, sourceData, True)
            text = handle_argument(text, datasource)

        if (card.get("buttons") is not None):
            fields = [
                {
                    "text": text,
                    "attribute": card.get("attribute"),
                    "value_list": [obj.get("title") for obj in card.get("buttons")]
                }
            ]
            contact = await update_current_contactinputs(contact, fields)

            result = await send_quickreply(bot, contact, text, card.get("buttons"))
            # LOG
            message_log = {
                "sender_id": str(bot_info.get('_id', '')),
                "recipient_id": contact.get('id', None),
                "create_at": now_timestamp(),
                "contact_id": contact.get('id', None),
                "contact_name": contact.get('name', None),
                "messaging_type": messaging_type,
                "message": {
                    "recipient": {"id": contact["id"], },
                    "message": {
                        "text": "{}".format(text),
                        "quick_replies": card.get("buttons"),
                    }
                },
                "result": result,
                "card_id": str(card['_id']),
                "block_id": block_id,
                "page_id": bot_info.get('page_id', None),
                "bot_id": str(bot_info.get('_id', ''))
            }
            await logdb.db['message_log'].insert_one(message_log)
            await send_to_chatinfo(message_log)

            return deepcopy(contact)

    return None


def quickreply_create_payload(reply_buttons):
    quick_btns = []
    for i in range(len(reply_buttons)):
        quick_btns.append(
            {
                "content_type": "text",
                "title": reply_buttons[i].get("title", "No title"),
                "payload": reply_buttons[i].get("payload", ""),
            }
        )
    return quick_btns


async def send_quickreply(bot, contact, quick_reply_message, reply_buttons):
    reply_payload = quickreply_create_payload(reply_buttons)
    payload = {
        "recipient": {"id": contact['id']},
        "message": {
            "text": "{}".format(quick_reply_message),
            "quick_replies": reply_payload,
        }
    }
    result = bot.send_raw(payload)
    # expired = await check_token_expire(result, bot)
    # if expired == True:
    #     bot.send_raw(payload)
    if result.get('error', None) is not None:
        contact = await set_unreachable_contact(contact, bot.bot_id)
    else:
        contact = await set_last_sent_contact(contact)

    return result
async def send_to_chatinfo(message):
    sender = ChatInfoHandlerFactory.get_hander(
        hander_type = ChatInfoHandlerType.CHATBOT_TO_CONTACT)()
    sender.send_message(message)