from application.client import HTTPClient
from bson import json_util
import json
from bson.objectid import ObjectId
from application.database import motordb, logdb
from application.common.helpers import now_timestamp
from application.controllers.facebook import check_token_expire
from application.controllers.facebook.contact import set_last_sent_contact, set_unreachable_contact
from application.controllers.integration.upstart_chatinfo import ChatInfoHandlerFactory, ChatInfoHandlerType


async def card_handler(card, bot, contact, block_id, messaging_type='message'):
    if (card):
        if contact is None:
            return False

        image_url = card.get("image")
        print(">>>>> image_url ", image_url)
        bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(bot.bot_id)})
        if image_url is not None and image_url != '':
            try:
                result = bot.send_image_url(contact["id"], image_url)
                # expired = await check_token_expire(result, bot)
                # if expired == True:
                #     bot.send_image_url(contact["id"], image_url)
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
                    "message": image_url,
                    "result": result,
                    "card_id": str(card['_id']),
                    "block_id": block_id,
                    "page_id": bot_info.get('page_id', None),
                    "bot_id": str(bot_info.get('_id', ''))
                }
                await logdb.db['message_log'].insert_one(message_log)
                await send_to_chatinfo(message_log)
            except:
                pass

    return None


async def create_message_broadcast(card):
    image_url = card.get("image")
    return {
        'attachment': {
            'type': 'image',
            'payload': {
                    'url': image_url
            }
        }
    }
async def send_to_chatinfo(message):
    sender = ChatInfoHandlerFactory.get_hander(
        hander_type = ChatInfoHandlerType.CHATBOT_TO_CONTACT)()
    sender.send_message(message)