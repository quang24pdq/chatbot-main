from application.server import app
from application.database import motordb, logdb
from datetime import datetime
import ujson, time, copy
from bson.objectid import ObjectId
from application.common.helpers import now_timestamp
from application.controllers.facebook.contact.current_input import update_current_contactinputs
from application.common.helpers import handle_argument
from application.controllers.facebook.contact import set_last_sent_contact, set_unreachable_contact
from application.controllers.integration.upstart_chatinfo import ChatInfoHandlerFactory, ChatInfoHandlerType

async def card_handler(card, bot, contact, block_id, messaging_type='message'):
    time = now_timestamp()
    fields = card.get("fields",[])
    bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(bot.bot_id)})

    if (len(fields) > 0):
        contact = await update_current_contactinputs(contact, fields)
        field = fields[0]
        text = field.get("text")

        if text is not None:
            result = bot.send_text_message(contact['id'], handle_argument(text, contact))
            if result.get('error', None) is not None:
                contact = await set_unreachable_contact(contact, str(bot_info.get('_id', '')))
            else:
                contact = await set_last_sent_contact(contact)

            message_log = {
                "sender_id": str(bot_info.get('_id', '')),
                "recipient_id": contact.get('id', None),
                "contact_id": contact.get('id', None),
                "contact_name": contact.get('name', None),
                "messaging_type": messaging_type,
                "message": handle_argument(text, contact),
                "result": result,
                "create_at": time,
                "card_id": str(card['_id']),
                "block_id": block_id,
                "page_id": bot_info.get('page_id', None),
                "bot_id": str(bot_info.get('_id', ''))
            }
            await logdb.db['message_log'].insert_one(message_log)
            await send_to_chatinfo(message_log)
            return copy.deepcopy(contact)

    return None

async def send_to_chatinfo(message):
    sender = ChatInfoHandlerFactory.get_hander(
        hander_type = ChatInfoHandlerType.CHATBOT_TO_CONTACT)()
    sender.send_message(message)