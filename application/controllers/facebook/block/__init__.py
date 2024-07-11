import importlib
import ujson
import random
import requests
import time
from copy import deepcopy
from datetime import datetime
from bson.objectid import ObjectId
from json_logic import jsonLogic
from gatco.response import json, text, html
from application.extensions import apimanager
from application.client import HTTPClient
from application.server import app
from application.database import motordb
from application.controllers.base import auth_func
from application.controllers.facebook.base import pre_post_set_position, pre_get_many_order_by
from application.common.helpers import now_timestamp
from application.controllers.facebook.contact.current_input import update_current_input_blocks,\
    update_current_input_card, cancel_current_input, reset_block_loop_counter, reset_current_card
from application.controllers.tenant import set_tenant, get_current_tenant_id


def handle_condition(contact, conditions, rule_condition):
    rules = []
    is_pass = True
    for condition in conditions:
        comparison = condition.get("comparison")
        attribute = condition.get("attribute")
        contact_value = contact.get(attribute)
        value = condition.get("value")
        if (not value or str(value).lower() == 'none' or str(value).lower() == 'null') and contact_value:
            is_pass = False
        elif value and str(value).lower() != 'none' and str(value).lower() != 'null' and not contact_value:
            is_pass = False

        # rule = {
        #     comparison: [contact_value, value]
        # }
        # rules.append(rule)
    # print ('rules ', rules)
    # return jsonLogic({rule_condition: rules})
    return is_pass


async def handle_block(bot, contact, block, position=0, messaging_type='message'):
    print("HANDLE BLOCK")
    # FIND NEXT CARD TO HANDLE
    block_id = block.get('block_id', None)
    try:
        ObjectId(block_id)
    except:
        block_info = await motordb.db['block'].find_one({'bot_id': bot.bot_id, 'payload': block_id})
        if block_info is not None:
            block_id = str(block_info.get('_id'))

    block_type = block.get('type', None)
    # cards = []
    card_cursor = None
    if block_type is None or block_type == 'block':
        card_cursor = motordb.db['card'].find({'bot_id': bot.bot_id, 'block_id': block_id, 'position': {'$gt': position}}, sort=[('position', 1)])
        # cards = await cards.to_list(length=100)
    elif block_type == 'broadcast':
        card_cursor = motordb.db['card'].find({'bot_id': bot.bot_id, 'broadcast_id': block_id, 'position': {'$gt': position}}, sort=[('position', 1)])
        # cards = await cards.to_list(length=100)

    found = False
    if card_cursor is not None:
        from application.controllers.facebook.card import handle_card
        async for card in card_cursor:
            found = True
            to_be_continue = await handle_card(bot, contact, card, messaging_type)
            # print ("to_be_continue ", to_be_continue)
            if to_be_continue is False:
                return False

    # RESET CARD
    contact = await reset_current_card(contact)
    contact = await reset_block_loop_counter(contact, block_id)
    if found == False:
        # check next block:
        if (len(contact['_current_input'].get('current_blocks', [])) > 0):
            handle_block_id = contact['_current_input']['current_blocks'].pop(0)
            contact = await update_current_input_blocks(contact, contact['_current_input']['current_blocks'])
            if handle_block_id is not None:
                await handle_block(bot, contact, {"block_id": handle_block_id, "type": "block"})

    return True



async def check_block_broadcast(request=None, instance_id=None, result=None, **kw):
    if result is None:
        print("======check_block_broadcast.result==None")
    else:
        broadcast_option = result.get("broadcast_options", None)

        if broadcast_option is not None and broadcast_option.get("message_creative_id", None) is not None:
            this_bot = await motordb.db['bot'].find_one({'_id': ObjectId(result.get("bot_id"))})
            if (this_bot is None):
                print("======check_block_broadcast.bot is==None")
            else:
                broadcast_id = broadcast_option.get("broadcast_id", None)
                resp_check_broadcast = await HTTPClient.get(app.config.get("FACEBOOK_GRAPH_URL")+broadcast_id+"/insights/messages_sent?access_token=" + this_bot['token'], {}, {})
                print("check_block_broadcast=====", resp_check_broadcast)
                if resp_check_broadcast is not None and resp_check_broadcast.get("data", None) is not None:
                    broadcast_info = {
                        "broadcast_options": result['broadcast_options']
                    }
                    broadcast_info['broadcast_options']['result'] = resp_check_broadcast.get(
                        "data", None)
                    await motordb.db['block'].update_one({'_id': ObjectId(result.get('_id'))}, {'$set': broadcast_info})


async def check_delete_block(requests=None, instance_id=None, **kw):
    if instance_id is not None:
        block_info = await motordb.db['block'].find_one({'_id': ObjectId(instance_id)})

        if block_info is None or ('default' in block_info and block_info['default'] == True):
            return json({
                'ok': False,
                'error_code': 'DEFAULT_DATA',
                'error_message': 'Can not remove default data'
            }, status=520)


@app.route('/api/v1/block/clone_block', methods=['POST'])
async def clone_block(request):
    data = request.json
    block_id = data.get("block_id", None)
    group_id = data.get("group_id", None)
    bot_id = data.get("bot_id", None)
    new_block = None

    if block_id is not None and group_id is not None:
        block = await motordb.db['block'].find_one({'_id': ObjectId(block_id), "bot_id": bot_id, "group_id": group_id})
        if block is not None:
            new_block = deepcopy(block)
            del new_block['_id']
            new_block["name"] = new_block["name"] + " " + "copy"
            new_block["default"] = False
            new_block['position'] = now_timestamp()
            new_block['created_at'] = now_timestamp()
            new_block['updated_at'] = now_timestamp()

            block_result = await motordb.db['block'].insert_one(new_block)
            new_block["_id"] = str(block_result.inserted_id)

            card = motordb.db["card"].find({"block_id": block_id})

            if card is not None:
                async for c in card:
                    new_card = deepcopy(c)
                    del new_card["_id"]
                    new_card["block_id"] = str(block_result.inserted_id)
                    new_block['created_at'] = now_timestamp()
                    new_block['updated_at'] = now_timestamp()

                    card_result = await motordb.db['card'].insert_one(new_card)

    return json(new_block)


@app.route('/api/v1/block/get', methods=['GET'])
async def change_block_name(request):
    block_id = request.args.get("id", None)
    name = request.args.get("name", None)
    if block_id is not None:
        block = await motordb.db['block'].find_one({'_id': ObjectId(block_id)})

        if block is None:
            return json({"error_message": "can not get block"})
        block['name'] = name
        result = await motordb.db['block'].update_one({"_id": ObjectId(block.get("_id"))}, {'$set': block})
        if result:
            return json({"status": "success"})
    else:
        return json({"status": "error"})

#
#
#
@app.route("/api/v1/block/update/attrs", methods=["PUT", "OPTIONS"])
async def update_properties(request):
    if request.method == "OPTIONS":
        return json(None)
    # try:
    data = request.json

    if data is None or '_id' not in data or data['_id'] is None:
        return json({"error_code": "", "error_message": ""}, status=520)

    block = await motordb.db['block'].find_one({'_id': ObjectId(data['_id'])})

    if block is not None:
        for name, value in data.items():
            if name != '_id':
                block[name] = value
        result = await motordb.db['block'].update_one({"_id": ObjectId(block.get("_id"))}, {'$set': block})
        if result:
            return json({"message": "success"})
        return json({"message": "error"}, status=520)
    # except:
    #     return json({"error_code": "EXCEPTION", "error_message": "EXCEPTION"}, status=520)


async def post_add_subscription_type(request=None, instance_id=None, result=None, **kw):
    pass


async def pre_process_delete_card(request=None, instance_id=None, **kw):
    if instance_id is not None:
        await motordb.db['card'].delete_many({'block_id': instance_id})


async def pre_order_by(search_params=None, **kw):
    #     search_params["filters"] = ("filters" in search_params)
    if search_params is None:
        search_params = {}

    if search_params.get('order_by', None) is not None and isinstance(search_params['order_by'], list):
        converted_orders = []
        for _ in search_params['order_by']:
            order = {}
            if _ is not None and len(_) > 0 and _.get('direction', None) is not None:
                if _.get('direction', None) == "asc":
                    order[_['field']] = 1
                else:
                    order[_['field']] = -1
                converted_orders.append(order)
        search_params['order_by'] = converted_orders
    else:
        search_params["order_by"] = [{"created_at": -1}]


async def post_process_get_block(request=None, instance_id=None, result=None, **kw):
    if result.get('objects') is not None and isinstance(result['objects'], list):
        for index, val in enumerate(result['objects']):

            if isinstance(val.get('created_at'), datetime):
                del result['objects'][index]['created_at']

            if isinstance(val.get('updated_at'), datetime):
                del result['objects'][index]['updated_at']
    
    elif result.get('_id') is not None:
        if isinstance(result.get('created_at'), datetime):
            del result['created_at']

        if isinstance(result.get('updated_at'), datetime):
            del result['updated_at']


apimanager.create_api(collection_name='block',
                      methods=['GET', 'POST', 'DELETE', 'PUT'],
                      url_prefix='/api/v1',
                      preprocess=dict(
                        DELETE_SINGLE=[check_delete_block, pre_process_delete_card],
                        GET_SINGLE=[auth_func],
                        GET_MANY=[auth_func, pre_get_many_order_by, pre_order_by],
                        POST=[auth_func, pre_post_set_position, set_tenant],
                        PUT_SINGLE=[auth_func]
                      ),
                      postprocess=dict(
                        POST=[],
                        GET_SINGLE=[check_block_broadcast, post_process_get_block],
                        GET_MANY=[post_process_get_block]
                    ))


# @app.route('/api/v1/block/clean')
# async def clean_block(request):
#     bot_id = request.args.get('bot_id')

#     query_groups = motordb.db['group'].find({'bot_id': bot_id})

#     available_group_ids = []
#     if query_groups is not None:
#         async for group in query_groups:
#             available_group_ids.append(str(group.get('_id')))

#     block_ids = []
#     await motordb.db['block'].delete_many({'bot_id': bot_id, 'group_id': {'$nin': available_group_ids}})
#     query_blocks = motordb.db['block'].find({'bot_id': bot_id, 'group_id': {'$nin': available_group_ids}})
#     if query_blocks is not None:
#         async for block in query_blocks:
#             block_ids.append(str(block.get('_id')))
#             # print ("BLOCK ", block.get('name'))
#     print ("block_ids ", block_ids)

#     await motordb.db['card'].delete_many({'bot_id': bot_id, 'block_id': {'$in': block_ids}})
#     query_cards = motordb.db['card'].find({'bot_id': bot_id, 'block_id': {'$in': block_ids}})
#     async for card in query_cards:
#         print ("card ", card.get('_id'))


#     return json({})
