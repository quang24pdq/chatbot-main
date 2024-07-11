from application.server import app
from application.database import motordb
from bson.objectid import ObjectId


async def card_handler(card, bot, contact, block_id, messaging_type='message'):
    fields = card.get("fields", [])
    if (len(fields) > 0):
        for field in fields:
            attr = field.get("attribute")
            value = field.get("value")
            if attr is not None and value is not None:
                contact[attr] = value
                await motordb.db['contact'].update_one({'_id': ObjectId(contact["_id"])}, {'$set': contact})

    return None
