from .button import handle_buttons
from application.common.helpers import handle_argument
from bson.objectid import ObjectId
from application.database import motordb, logdb
from application.controllers.facebook import check_token_expire
from application.controllers.facebook.contact import set_last_sent_contact, set_unreachable_contact
from application.common.helpers import now_timestamp
from application.controllers.integration.upstart_chatinfo import ChatInfoHandlerFactory, ChatInfoHandlerType

async def card_handler(card, bot, contact, block_id, messaging_type='message'):
    text = card.get("text")
    bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(bot.bot_id)})

    if (text and text.find("{{") >= 0 and text.find("}}") >= 0):
        text = handle_argument(text, contact)
    if (card.get("buttons") and await handle_buttons(card.get("buttons")) is not None):
        buttons = card.get("buttons")
        payload = await handle_buttons(buttons)
        result = bot.send_button_message(contact["id"], handle_argument(text, contact), payload)
        # expired = await check_token_expire(result, bot)
        # if expired == True:
        #     bot.send_button_message(contact["id"], handle_argument(text, contact), payload)
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
                "text": handle_argument(text, contact),
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
        result = bot.send_text_message(contact["id"], handle_argument(text, contact))
        # expired = await check_token_expire(result, bot)
        # if expired == True:
        #     bot.send_text_message(contact["id"], handle_argument(text, contact))
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
            "messaging_type": "card",
            "message": handle_argument(text, contact),
            "result": result,
            "card_id": str(card['_id']),
            "block_id": block_id,
            "page_id": bot_info.get('page_id', None),
            "bot_id": str(bot_info.get('_id', ''))
        }
        await logdb.db['message_log'].insert_one(message_log)
    await send_to_chatinfo(message_log)
    return None

async def send_to_chatinfo(message):
    sender = ChatInfoHandlerFactory.get_hander(
        hander_type = ChatInfoHandlerType.CHATBOT_TO_CONTACT)()
    sender.send_message(message)