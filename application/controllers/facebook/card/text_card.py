from application.database import motordb, logdb
from bson.objectid import ObjectId
from gatco_restapi.helpers import to_dict
from .button import handle_buttons
from application.common.helpers import handle_argument
from application.common.helpers import now_timestamp, merge_objects
from application.controllers.facebook import check_token_expire
from application.controllers.facebook.contact import set_last_sent_contact, set_unreachable_contact
from application.controllers.facebook.message.messaging_session import get_session_detection
from application.controllers.integration.upstart_chatinfo import ChatInfoHandlerFactory, ChatInfoHandlerType

async def card_handler(card, bot, contact, block_id, messaging_type='message'):
    print("==============TEXT CARD HANDLER============")
    text = card.get("text")
    bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(bot.bot_id)})
    session_ai_detection = await get_session_detection(bot_info['page_id'], contact, None)

    if (card.get("buttons") and await handle_buttons(card.get("buttons"), card, block_id, contact) is not None):
        buttons = card.get("buttons")
        payload = await handle_buttons(buttons, card, block_id, contact)
        if (text and text.find("{{") >= 0 and text.find("}}") >= 0):
            try:
                datasource = merge_objects(session_ai_detection, contact, False)
                text = handle_argument(text, datasource)
            except:
                print(
                    "text_card.card_handler   can not parser text card==============================", text)

        sourceData = merge_objects({
            'page_id': bot_info.get('page_id', ''),
            'page_name': bot_info.get('page_name', ''),
        }, contact)
        datasource = merge_objects(session_ai_detection, sourceData, False)
        result = bot.send_button_message(contact["id"], handle_argument(text, datasource), payload)
        if result.get('error', None) is not None:
            contact = await set_unreachable_contact(contact, str(bot_info.get('_id', '')))
        else:
            contact = await set_last_sent_contact(contact)

        # LOG
        message_log = {
            "sender_id": str(bot_info.get('_id', '')),
            "recipient_id": contact.get('id', None),
            "create_at": now_timestamp(),
            "contact_id": contact.get('id', None),
            "contact_name": contact.get('name', None),
            "messaging_type": messaging_type,
            "message": {
                "text": handle_argument(text, datasource),
                "payload": payload
            },
            "result": result,
            "card_id": str(card['_id']),
            "block_id": block_id,
            "page_id": bot_info.get('page_id', None),
            "bot_id": str(bot_info.get('_id', ''))
        }
        await logdb.db['message_log'].insert_one(message_log)

    else:
        sourceData = merge_objects({
            'page_id': bot_info.get('page_id', ''),
            'page_name': bot_info.get('page_name', ''),
        }, contact)
        datasource = merge_objects(session_ai_detection, sourceData, False)
        result = bot.send_text_message(contact['id'], handle_argument(text, datasource))
        if 'error' in result:
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
            "message": handle_argument(text, datasource),
            "result": result,
            "card_id": str(card['_id']),
            "block_id": block_id,
            "page_id": bot_info.get('page_id', None),
            "bot_id": str(bot_info.get('_id', ''))
        }
        await logdb.db['message_log'].insert_one(message_log)

        # expired = await check_token_expire(result, bot)
        # if expired == True:
        #     bot.send_text_message(
        #         contact['id'], handle_argument(text, datasource))
        contact = await set_last_sent_contact(contact)
    await send_to_chatinfo(message_log)

    return None


async def create_message_broadcast(card):
    if (card.get("buttons") and await handle_buttons(card.get("buttons")) is not None):
        buttons = card.get("buttons")
        payload_buttons = await handle_buttons(buttons)
        return {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "button",
                    "text": card.get('text'),
                    "buttons": payload_buttons
                }
            }
        }
    else:
        return {'text': card.get('text')}

async def send_to_chatinfo(message):
    sender = ChatInfoHandlerFactory.get_hander(
        hander_type = ChatInfoHandlerType.CHATBOT_TO_CONTACT)()
    sender.send_message(message)