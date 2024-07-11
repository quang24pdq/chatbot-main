import uuid
import importlib
from datetime import datetime
from application.extensions import apimanager
from bson.objectid import ObjectId
from gatco.response import json
from application.server import app
from application.database import motordb
from application.controllers.base import auth_func
from application.common.helpers import now_timestamp
from application.controllers.facebook.base import pre_post_set_position, pre_get_many_order_by
from application.controllers.tenant import set_tenant


async def check_continue_card(card):
    if card is not None:
        card = await motordb.db['card'].find_one({'_id': ObjectId(card.get('_id'))})
        if card is not None:
            next_cards = []
            next_card_cursor = motordb.db['card'].find({'bot_id': card.get('bot_id'), 'block_id': card.get('block_id'), 'position': {'$gt': card.get('position')}}, sort=[('position', 1)])

            next_cards = await next_card_cursor.to_list(length=100)

            if len(next_cards) > 0:
                return next_cards[0]

    return None


async def handle_card(bot, contact, current_card, messaging_type='message'):
    from application.controllers.facebook.contact.current_input import update_current_input_card
    print("HANDLE CARD ", str(current_card.get('type')).upper())
    contact = await update_current_input_card(contact, current_card)
    if current_card is not None:
        block_id = current_card.get("block_id", None)
        card_type = current_card.get("type", None)
        if card_type is not None:
        
            card_handler_name = "application.controllers.facebook.card." + card_type + "_card"
            card_handler = None
            card_handler = importlib.import_module(card_handler_name)

            if card_handler is not None:
                result = await card_handler.card_handler(current_card, bot, contact, block_id, messaging_type)
                # False: handle card failed
                # True: handle card successully
                if result is not None:
                    contact = result
                    return False
    return True


@app.route('/api/v1/card/change_position', methods=['POST'])
async def change_card_position(request):
    data = request.json
    block_id = data.get("block_id")
    card_id = data.get("card_id")
    action = data.get("action")
    now_time = now_timestamp()

    if (block_id is not None) and (card_id is not None) and (action is not None):
        cursor = motordb.db["card"].find({"block_id": block_id}, sort=[('position', 1)])
        prev_card = None
        async for card in cursor:
            if action == "up":
                if (prev_card is not None) and (str(card["_id"]) == card_id):
                    prev_pos = {
                        "position": card.get("position"),
                        "updated_at": now_time
                    }
                    cur_pos = {
                        "position": prev_card.get("position"),
                        "updated_at": now_time
                    }
                    if cur_pos.get("position") == prev_pos.get("position"):
                        cur_pos["position"] = prev_pos.get("position", 1) + 1

                    if isinstance(prev_card.get('created_at'), datetime):
                        prev_card['created_at'] = now_time
                    if isinstance(cur_pos.get('created_at'), datetime):
                        cur_pos['created_at'] = now_time

                    result = await motordb.db['card'].update_one({"_id": ObjectId(prev_card.get("_id"))}, {'$set': prev_pos})
                    result = await motordb.db['card'].update_one({"_id": ObjectId(card.get("_id"))}, {'$set': cur_pos})
                    block = await motordb.db['block'].find_one({'_id': ObjectId(block_id)})
                    block["_id"] = str(block["_id"])
                    if isinstance(block.get('created_at'), datetime):
                        del block['created_at']
                    if isinstance(block.get('updated_at'), datetime):
                        del block['updated_at']
                    return(json(block))

            if action == "down":
                if (prev_card is not None) and (str(prev_card["_id"]) == card_id):
                    prev_pos = {
                        "position": card.get("position"),
                        "updated_at": now_time
                    }
                    cur_pos = {
                        "position": prev_card.get("position"),
                        "updated_at": now_time
                    }
                    if cur_pos.get("position") == prev_pos.get("position"):
                        prev_pos["position"] = cur_pos.get("position", 1) + 1

                    if isinstance(prev_card.get('created_at'), datetime):
                        prev_card['created_at'] = now_time
                    if isinstance(cur_pos.get('created_at'), datetime):
                        cur_pos['created_at'] = now_time
                    result = await motordb.db['card'].update_one({"_id": ObjectId(prev_card.get("_id"))}, {'$set': prev_pos})
                    result = await motordb.db['card'].update_one({"_id": ObjectId(card.get("_id"))}, {'$set': cur_pos})
                    block = await motordb.db['block'].find_one({'_id': ObjectId(block_id)})
                    block["_id"] = str(block["_id"])
                    if isinstance(block.get('created_at'), datetime):
                        del block['created_at']
                    if isinstance(block.get('updated_at'), datetime):
                        del block['updated_at']
                    return(json(block))
            prev_card = card

    return json({"error_code": "ERROR", "error_message": "error"}, status=520)


async def preprocess_card(data=None, **kw):
    if data['type'] == 'contactinput':
        if len(data["fields"]) > 0 and data['bot_id'] is not None:
            bot_id = data['bot_id']
            this_bot = await motordb.db['bot'].find_one({'_id': ObjectId(bot_id)})
            if this_bot is None:
                return json({"error_code": "NOT_FOUND", "error_message": "not found bot"}, status=520)

            user_define_attributes = []
            if "user_define_attribute" in this_bot:
                user_define_attributes = this_bot['user_define_attribute']

            fields = data["fields"]
            for field in fields:
                if field['attribute'] not in user_define_attributes:
                    user_define_attributes.append(field['attribute'])
            this_bot['user_define_attribute'] = user_define_attributes
            this_bot['updated_at'] = now_timestamp()
            update = await motordb.db['bot'].update_one({"_id": ObjectId(bot_id)}, {'$set': this_bot})
    elif data['type'] == 'jsonapi':
        if not isinstance(data['attributes'], list):
            data['attributes'] = []


@app.route('/api/v1/card/migrate')
async def migrate(request):
    cards = motordb.db['card'].find()
    async for card in cards:
        if card.get('buttons', None) is not None and isinstance(card['buttons'], list) and len(card['buttons']) > 0:
            for index, btn in enumerate(card['buttons']):
                card['buttons'][index]['_id'] = btn['id'] if btn.get('id', None) is not None else str(uuid.uuid4())
                if 'id' in card['buttons'][index]:
                    del card['buttons'][index]['id']
                result = await motordb.db['card'].update_one({'_id': ObjectId(card['_id'])}, {'$set': card})

    return json({
        'ok': True
    })


async def postprocess_get_many(request, instance_id=None, result=None, **kw):
    if result is not None and result.get('objects') is not None:
        for _ in result.get('objects'):
            if isinstance(_.get('created_at'), datetime):
                del _['created_at']
            if isinstance(_.get('updated_at'), datetime):
                del _['updated_at']
            


apimanager.create_api(collection_name='card',
    methods=['GET', 'POST', 'DELETE', 'PUT'],
    url_prefix='/api/v1',
    preprocess=dict(
        GET_SINGLE=[auth_func],
        GET_MANY=[auth_func, pre_get_many_order_by],
        POST=[auth_func, preprocess_card,
            pre_post_set_position, set_tenant],
        PUT_SINGLE=[auth_func, preprocess_card]
    ),
    postprocess=dict(
        GET_MANY=[postprocess_get_many]
    )
)
