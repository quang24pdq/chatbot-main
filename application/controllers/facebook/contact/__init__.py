import requests, ujson
from copy import deepcopy
from datetime import datetime
from gatco.response import json
from bson.objectid import ObjectId
from application.extensions import apimanager
from application.server import app
from application.database import motordb
from application.controllers.base import auth_func
from application.controllers.tenant import set_tenant
from application.common.helpers import now_timestamp, merge_objects
from application.bot import UpBot


async def set_reachable_contact(request, message, contact):
    now = now_timestamp()
    if contact is not None and (message.get('message', None) is not None or\
        message.get('referral', None) is not None or\
        message.get('postback', None) is not None):

        contact['reachable'] = True
        contact['interacted'] = True
        contact['last_sent'] = now
        contact['updated_at'] = now
        await motordb.db['contact'].update_one({'_id': ObjectId(contact['_id'])}, {'$set': contact})

    return deepcopy(contact)


async def set_unreachable_contact(contact, bot_id):
    now = now_timestamp()
    contact['reachable'] = False
    contact['updated_at'] = now
    await motordb.db['contact'].update_one({'_id': ObjectId(contact['_id'])}, {'$set': contact})

    return deepcopy(contact)


async def set_last_sent_contact(contact):
    now = now_timestamp()
    contact['last_sent'] = now
    contact['updated_at'] = now
    await motordb.db['contact'].update_one({'_id': ObjectId(contact['_id'])}, {'$set': contact})

    return deepcopy(contact)


async def set_last_read(bot, sender, message):

    if message.get('read', None) is not None and message['read'].get('watermark', None) is not None:
        contact = await motordb.db['contact'].find_one({'bot_id': bot.bot_id, 'id': sender.get('id')})
        if contact is not None:
            water_mark = message['read']['watermark']
            contact['last_seen'] = water_mark
            contact['updated_at'] = now_timestamp()
            await motordb.db['contact'].update_one({'_id': ObjectId(contact['_id'])}, {'$set': contact})


async def load_contact_info(tenant_id, bot, sender, page_id, source=None):
    now = now_timestamp()
    contact = await motordb.db['contact'].find_one({'bot_id': bot.bot_id, 'id': sender['id']})
    info = bot.get_user_info(sender['id'])
    print("=======SENDER INFO ========", sender)
    print("=======USER INFO FROM FACEBOOK========", info)
    if contact is None and sender is not None:
        if info is None:
            info = {}
            if sender is not None and sender.get('id', None) is not None and sender.get('name', None) is not None:
                info = {
                    "id": sender['id'],
                    "name": sender.get('name', None),
                    "client_mac": sender.get('client_mac', None)
                }

        if info is not None and info.get("name") is None:
            if (info.get("first_name", None) is not None) or (info.get("last_name", None) is not None):
                info["name"] = info.get(
                    "first_name", "") + " " + info.get("last_name", "")
                info["name"] = info["name"].strip()
                if info.get('profile_pic', None) is not None and info['profile_pic'] != '':
                    info['profile_pic'] = info.get('profile_pic', '')

        info['id'] = sender['id']
        info['page_id'] = page_id
        info['bot_id'] = bot.bot_id
        info['contact_type'] = 'facebook_psid'
        info['source'] = source if source is not None else None
        info['client_mac'] = sender.get('client_mac', None)
        info['last_action'] = {}
        info['last_sent'] = now
        info['last_seen'] = now
        info['interacted'] = False
        info['reachable'] = False
        info['created_at'] = now
        info['updated_at'] = now
        info["_current_input"] = {}
        result = await motordb.db['contact'].insert_one(info)

        contact = info
        contact['_id'] = result.inserted_id

        # headers = {
        #     "Content-Type": "application/json",
        # }
        # persistent_menu_data = {
        #     'tenant_id': tenant_id,
        #     'bot_id': str(bot.bot_id),
        #     'psid': sender['id']
        # }
        # requests.post(app.config.get('HOST_URL') + '/api/v1/persistent_menu/custom_user_settings',\
        #     data=ujson.dumps(persistent_menu_data), headers=headers)

    else:
        if info is not None:
            if 'id' in info:
                del info['id']
            if '_id' in info:
                del info['_id']

            for key in sender:
                info[key] = sender[key]
            updated_contact = merge_objects(info, contact, False)
            if sender.get('client_mac', None) is not None and sender.get('client_mac', "") != "":
                updated_contact['client_mac'] = sender.get('client_mac', None)

            await motordb.db['contact'].update_one({'_id': ObjectId(contact['_id'])}, {'$set': updated_contact})
            contact = updated_contact

    if "_current_input" not in contact:
        contact["_current_input"] = {}

    return deepcopy(contact)


async def update_contact(contact, data):
    # print("<><><><><><> UPDATE CONTACT <><><><><> ", data)
    if data is not None:
        # contact = await motordb.db['contact'].find_one({'_id': ObjectId(_id)})

        contact = merge_objects(data, contact, False)

        await motordb.db['contact'].update_one({'_id': ObjectId(contact.get('_id'))}, {'$set': contact})

    return deepcopy(contact)


@app.route('/api/v1/contact/reachable/total', methods=['GET'])
async def count_reachables(request):
    try:
        bot_id = request.args.get('bot_id', None)
        bot_info = await motordb.db['bot'].find_one({"_id": ObjectId(bot_id)})

        if bot_id is None or bot_info is None:
            return json({
                'reachables': 0
            })

        reachables = await motordb.db['contact'].count_documents({'bot_id': bot_id, 'page_id': bot_info.get('page_id'), 'reachable': True})

        return json({
            'reachables': reachables
        }, status=200)
    except:
        return json({
            'ok': False,
            'error_code': "EXCEPTION",
            'error_message': "EXCEPTION",
        }, status=520)


@app.route('/api/v1/contact/interaction/total', methods=['GET'])
async def get_total_interaction(request):
    bot_id = request.args.get('bot_id', None)
    bot_info = await motordb.db['bot'].find_one({"_id": ObjectId(bot_id)})
    if bot_id is None or bot_info is None:
        return json({
            'interaction': 0
        })

    interacted_contact = await motordb.db['contact'].count_documents({
        'bot_id': bot_id,
        'page_id': bot_info.get('page_id'),
        'interacted': True
    })

    return json({
        'interaction': interacted_contact
    })



# @app.route('/api/v1/contact/migrate')
# async def migrate(request):
#     bot_id = request.args.get('bot_id')

#     contact_cusor = motordb.db['contact'].find({'bot_id': bot_id})

#     ii = 0
#     async for contact in contact_cusor:
#         ii += 1
#         # 2019-07-31 05:34:05.261000
#         if isinstance(contact.get("created_at", None), float):
#             if contact.get("created_at", 0) == 0:
#                 contact['created_at'] = now_timestamp()
#                 await motordb.db['contact'].update_one({'_id': ObjectId(contact['_id'])}, {'$set': contact})
#             elif contact.get("created_at", 0) < 15645780576:
#                 print ("NHO HON <<<<")
#                 contact['created_at'] = contact['created_at'] * 1000
#                 await motordb.db['contact'].update_one({'_id': ObjectId(contact['_id'])}, {'$set': contact})
#             elif contact.get("created_at", 0) > 15645780576580:
#                 print ("LON HON >>>>")
#                 contact['created_at'] = contact['created_at'] / 1000
#                 await motordb.db['contact'].update_one({'_id': ObjectId(contact['_id'])}, {'$set': contact})

#         elif isinstance(contact.get("created_at", None), int):
#             if contact.get("created_at", 0) == 0:
#                 contact['created_at'] = now_timestamp()
#                 await motordb.db['contact'].update_one({'_id': ObjectId(contact['_id'])}, {'$set': contact})
#             elif contact.get("created_at", 0) < 15645780576:
#                 print ("NHO HON <<<<")
#                 contact['created_at'] = contact['created_at'] * 1000
#                 await motordb.db['contact'].update_one({'_id': ObjectId(contact['_id'])}, {'$set': contact})
#             elif contact.get("created_at", 0) > 15645780576580:
#                 print ("LON HON >>>>")
#                 contact['created_at'] = contact['created_at'] / 1000
#                 await motordb.db['contact'].update_one({'_id': ObjectId(contact['_id'])}, {'$set': contact})

#         elif isinstance(contact.get("created_at", None), datetime):
#             contact['created_at'] = round(contact['created_at'].timestamp() * 1000)
#             await motordb.db['contact'].update_one({'_id': ObjectId(contact['_id'])}, {'$set': contact})

#         elif isinstance(contact.get("created_at", None), list):
#             for _ in contact['created_at']:
#                 contact['created_at'] = round(_.timestamp() * 1000)
#                 await motordb.db['contact'].update_one({'_id': ObjectId(contact['_id'])}, {'$set': contact})
#         else:
#             contact['created_at'] = now_timestamp()
#             await motordb.db['contact'].update_one({'_id': ObjectId(contact['_id'])}, {'$set': contact})

#         print (ii)

#     return json(None)


# @app.route('/api/v1/contact/migrate')
# async def migrate(request):

#     contact_cusor = motordb.db['contact'].find({"reachable": True})

#     ii = 0
#     async for contact in contact_cusor:
#         ii += 1
#         contact['interacted'] = contact['reachable']
#         await motordb.db['contact'].update_one({'_id': ObjectId(contact['_id'])}, {'$set': contact})

#         print (ii)

#     return json(None)


async def pre_order_by(search_params=None, **kw):
    #     search_params["filters"] = ("filters" in search_params)

    if search_params is None:
        search_params = {}

    if search_params.get('order_by', None) is not None and isinstance(search_params['order_by'], list):
        converted_orders = []
        for _ in search_params['order_by']:
            order = {}
            if _['direction'] == "asc":
                order[_['field']] = 1
            else:
                order[_['field']] = -1
            converted_orders.append(order)
        search_params['order_by'] = converted_orders
    else:
        search_params["order_by"] = [{"created_at": -1}]


# apimanager.create_api(collection_name='contactinput',
#                       methods=['GET', 'POST', 'DELETE', 'PUT'],
#                       url_prefix='/api/v1',
#                       preprocess=dict(
#                           GET_SINGLE=[auth_func],
#                           GET_MANY=[auth_func],
#                           POST=[auth_func, set_tenant],
#                           PUT_SINGLE=[auth_func]
#                       )
#                       )


async def format_data_postprocess(request=None, instant_id=None, result=None, **kw):
    if result is not None and isinstance(result.get('objects'), list):
        objects = []

        for index, item in enumerate(result['objects']):
            if '_current_input' in item:
                del item['_current_input']
            
            if 'client_mac' in item:
                del item['client_mac']

            objects.append(item)
        
        result['objects'] = objects

@app.route('/api/v1/contact/conversations', methods=['POST', 'GET'])
async def conversations_contact(request):
    data = request.json

    # print ("DATA: ", data)

    if data is not None and isinstance(data, list) == True:
        for _ in data:
            try:
                bot_info = await motordb.db['bot'].find_one({"_id": ObjectId(_.get('bot_id')), 'tenant_id': _.get('tenant_id')})
                token = bot_info.get("token", None)
                bot = UpBot(str(bot_info.get('_id')), token, api_version=app.config.get('FACEBOOK_API_VERSION'))
                user_info = bot.get_user_info(_.get('id'))

                contact_exits = await motordb.db['contact'].find_one({
                    'id': _['id'],
                    'bot_id': _.get('bot_id'),
                    'page_id': bot_info.get('page_id')
                })

                if contact_exits is None:
                    new_contact = {
                        'id': _['id'],
                        'name': _['name'],
                        'contact_type': 'facebook_psid',
                        'interacted': False,
                        'reachable': True,
                        'source': 'MESSAGE',
                        'created_at': now_timestamp(),
                        'bot_id': _.get('bot_id'),
                        'page_id': _['page_id'],
                        'tenant_id': _['tenant_id']
                    }
                    if user_info is not None:
                        for key in user_info:
                            if user_info.get(key) is not None:
                                new_contact[key] = user_info.get(key)
                    await motordb.db['contact'].insert_one(new_contact)
                else:
                    if user_info is not None:
                        for key in user_info:
                            if user_info.get(key) is not None:
                                contact_exits[key] = user_info.get(key)

                    contact_exits['reachable'] = True
                    if contact_exits.get('source') is None:
                        contact_exits['source'] = 'message'
                    if contact_exits.get('created_at') is None:
                        contact_exits['created_at'] = now_timestamp()
                    await motordb.db['contact'].update_one({'_id': ObjectId(contact_exits.get('_id'))}, {'$set': contact_exits})

            except:
                pass

    return json({})


@app.route('/api/v1/contact/update', methods=['POST', 'GET'])
async def contact_update(request):
    _ = request.json
    try:
        bot_info = await motordb.db['bot'].find_one({"_id": ObjectId(_.get('bot_id')), 'tenant_id': _.get('tenant_id')})
        
        print('---bot_info---', bot_info)
        token = bot_info.get("token", None)
        bot = UpBot(str(bot_info.get('_id')), token, api_version=app.config.get('FACEBOOK_API_VERSION', 7.0))
        user_info = bot.get_user_info(_.get('id'))

        contact_exits = await motordb.db['contact'].find_one({
            'id': _['page_scope_id'],
            'bot_id': _.get('bot_id'),
            'page_id': bot_info.get('page_id'),
            'tenant_id': _.get('tenant_id')
        })

        contact_exits['name'] = _.get('name', None)
        contact_exits['gender'] = _.get('gender', None)
        contact_exits['phone'] = _.get('phone', None)

        await motordb.db['contact'].update_one({'_id': ObjectId(contact_exits['_id'])}, {'$set': contact_exits})

    except:
        pass
    return json({})

apimanager.create_api(collection_name='contact',
    methods=['GET', 'POST', 'DELETE', 'PUT'],
    url_prefix='/api/v1',
    preprocess=dict(
        GET_SINGLE=[auth_func],
        GET_MANY=[auth_func, pre_order_by],
        POST=[auth_func, set_tenant],
        PUT_SINGLE=[auth_func]
    ),
    postprocess=dict(
        GET_MANY=[format_data_postprocess],
    )
)
