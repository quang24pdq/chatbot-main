from datetime import datetime
import requests
from copy import deepcopy
import ujson
from application.extensions import auth
from application.server import app
from gatco.response import json, text
from gatco_restapi.helpers import to_dict
from application.extensions import apimanager
from application.controllers.base import auth_func
from bson.objectid import ObjectId
from application.database import motordb
from application.client import HTTPClient
from application.common.constants import STATUS_CODE, ERROR_CODE, ERROR_MSG
from application.common.helpers import convert_phone_number, now_timestamp, get_milisecond, current_local_datetime,\
    get_days_from_date, get_utc_from_local_datetime
from application.controllers.tenant import set_tenant, get_current_tenant_id
from application.controllers.user import get_current_user


@app.route('/api/v1/contact/paging', methods=['GET'])
async def paging_contact(request):
    await auth_func(request)
    tenant_id = request.args.get('tenant_id', None)
    bot_id = request.args.get('bot_id', None)
    page_id = request.args.get('page_id', None)
    page = int(request.args.get('page', 1))
    page_size = int(request.args.get('page_size', 25))

    if tenant_id is None:
        return json({
            "error_code": "INVALID_REQUEST",
            "error_message": "",
            "data": []
        })

    bot_info = None
    if bot_id is not None:
        bot_info = await motordb.db['bot'].find_one({'tenant_id': tenant_id, 'bot_id': bot_id})
    else:
        bot_info = await motordb.db['bot'].find_one({'tenant_id': tenant_id, 'page_id': str(page_id), "subscribed": True})

    if bot_info is None:
        return json({
            "page": 1,
            "page_size": 25,
            "data": []
        })

    cursor = None
    if bot_id is not None:
        cursor = motordb.db['contact'].find({
            'bot_id': str(bot_info.get('_id')),
            'page_id': bot_info.get('page_id'),
            '$or': [
                {'interacted': True},
                {'reachable': True}
            ]
        }).limit(page_size).skip((page - 1) * page_size)
    else:
        cursor = motordb.db['contact'].find({
            'page_id': bot_info.get('page_id'),
            '$or': [
                {'interacted': True},
                {'reachable': True}
            ]
        }).limit(page_size).skip((page - 1) * page_size)

    results = []
    if cursor is not None:
        async for contact in cursor:
            must_update = False
            created_at = contact.get('created_at')
            if isinstance(created_at, list):
                must_update = True
                created_at = created_at[0].timestamp()
            elif isinstance(created_at, datetime):
                must_update = True
                created_at = created_at.timestamp()
            else:
                pass
            
            updated_at = contact.get('updated_at')
            if isinstance(updated_at, list):
                must_update = True
                updated_at = updated_at[0].timestamp()
            elif isinstance(updated_at, datetime):
                must_update = True
                updated_at = updated_at.timestamp()
            else:
                pass

            contact['created_at'] = int(created_at)
            contact['updated_at'] = int(updated_at)
            if must_update == True:
                await motordb.db['contact'].update_one({'_id': ObjectId(contact["_id"])}, {'$set': contact})

            contact['_id'] = str(contact['_id'])

            if '_current_input' in contact:
                del contact['_current_input']

            results.append(contact)

    return json({
        "page": page,
        "page_size": page_size,
        "data": results
    })


@app.route('/api/v1/contact/get_by_id/<id>', methods=['GET'])
async def get_contact_by_page_scoped_id(request, id):
    tenant_id = request.args.get('tenant_id')
    page_id = request.args.get('page_id')
    bot_id = request.args.get('bot_id')

    # ACTIVE BOT
    bot_info = None
    if bot_id is not None:
        bot_info = await motordb.db['bot'].find_one({
            'tenant_id': tenant_id,
            '_id': ObjectId(bot_id)
        })
    else:
        bot_info = await motordb.db['bot'].find_one({
            'tenant_id': tenant_id,
            'page_id': page_id,
            'subscribed': True,
            'active': True
        })

    if bot_info is not None:
        contact = await motordb.db['contact'].find_one({
            'bot_id': str(bot_info.get('_id')),
            'id': id
        })

        if contact is not None:
            dict_contact = {}
            for key in ['id', 'first_name', 'last_name', 'profile_pic', 'name', 'page_id', 'bot_id', 'phone', 'birthday', 'gender']:
                dict_contact[key] = contact.get(key)
            return json(dict_contact)
    return json(None)


@app.route('/api/v1/contact/get_by_phone', methods=['GET'])
async def get_contact_by_phone(request):
    await auth_func(request)
    tenant_id = request.args.get('tenant_id')
    page_id = request.args.get('page_id')
    page_scoped_id = request.args.get('page_scoped_id')
    phone = request.args.get('phone')

    # ACTIVE BOT
    bot_info = await motordb.db['bot'].find_one({
        'tenant_id': tenant_id,
        'page_id': page_id,
        'subscribed': True,
        'active': True
    })
    # current_tenant = get_current_tenant_id(request)
    # print ('bot_info ', bot_info)
    if bot_info is not None:
        contact = await motordb.db['contact'].find_one({
            'bot_id': str(bot_info.get('_id')),
            'id': page_scoped_id,
            'phone': convert_phone_number(phone)
        })

        if contact is None:
            contact = await motordb.db['contact'].find_one({
                'bot_id': str(bot_info.get('_id')),
                'phone': convert_phone_number(phone),
                'interacted': True
            })
        if contact is not None:
            dict_contact = {}
            for key in ['id', 'first_name', 'last_name', 'profile_pic', 'name', 'page_id', 'bot_id', 'phone', 'birthday', 'gender']:
                dict_contact[key] = contact.get(key)
            return json(dict_contact)
    return json(None)


@app.route('/api/v1/contact/interacted/paging', methods=['GET'])
async def paging_contact(request):
    await auth_func(request)
    tenant_id = request.args.get('tenant_id', None)
    bot_id = str(request.args.get('bot_id', None))
    page_id = str(request.args.get('page_id', None))
    page = int(request.args.get('page', 1))
    page_size = int(request.args.get('page_size', 25))

    if tenant_id is None:
        return json({
            "error_code": "INVALID_REQUEST",
            "error_message": "",
            "data": []
        })

    bot_info = None
    if bot_id is not None:
        bot_info = await motordb.db['bot'].find_one({ 'tenant_id': tenant_id, '_id': ObjectId(bot_id), 'subscribed': True })
    else:
        bot_info = await motordb.db['bot'].find_one({ 'tenant_id': tenant_id, 'page_id': page_id, 'subscribed': True })

    if bot_info is None:
        return json({
            "page": 1,
            "page_size": page_size,
            "data": []
        })

    cursor = None
    if bot_id is not None:
        cursor = motordb.db['contact'].find({'bot_id': str(bot_info.get('_id')), 'interacted': True}).limit(page_size).skip((page - 1) * page_size)
    else:
        cursor = motordb.db['contact'].find({'page_id': bot_info.get('page_id'), 'interacted': True}).limit(page_size).skip((page - 1) * page_size)

    results = []
    if cursor is not None:
        async for contact in cursor:
            contact['_id'] = str(contact['_id'])
            # print ("<>>>>>>> ", contact)
            if '_current_input' in contact:
                del contact['_current_input']
            results.append(contact)

    return json({
        "page": page,
        "page_size": page_size,
        "data": results
    })


# {
#     'id': '',
#     'bot_id': '',
#     'phone': '',
#     'birthday': '',
#     'gender': '',
#     ...
# }
@app.route('/api/v1/contact/update_info', methods=['PUT'])
async def api_update_contact_info(request):
    body_data = request.json
    if body_data is None or body_data.get('id') is None or body_data.get('bot_id') is None:
        return json({
            'error_code': 'INVALID_DATA',
            'error_message': ''
        }, status=520)
    
    contact_info = await motordb.db['contact'].find_one({
        'id': body_data.get('id'),
        'bot_id': body_data.get('bot_id')
    })

    for key in body_data:
        if key not in ['_id', 'bot_id', 'id', 'created_at'] and not body_data.get(key) == False:
            contact_info[key] = body_data.get(key)

    await motordb.db['contact'].update_one({'_id': ObjectId(contact_info.get('_id'))}, {'$set': contact_info})
    return json({
        'message': 'success'
    })


# INTEGRATE CRM
@app.route('/api/v1/integrate/map_contact', methods=["POST"])
async def map_contact(request):
    body_data = request.json
    
    tenant_id = body_data.get('tenant_id', None)

    id = body_data.get('id', None)
    psid = body_data.get('page_scope_id', None)


    return json({})


# {"evnet_id": 1, "timestamp": 123123123, "tenant_id": "demo", data: {}}
@app.route("/api/v1/contact/hook", methods=["POST"])
async def hook_contact(request):
    body_data = request.json

    if body_data is None:
        return json({
            "error_code": "",
            "error_message": ""
        })

    event_id = body_data.get('event_id')
    timestamp = body_data.get('timestamp')
    tenant_id = body_data.get('tenant_id')
    if event_id == 1:
        # SYNC CONFIG ID
        page_id = body_data['data'].get('page_id')
        psid = body_data['data'].get('psid')
        contact_id = body_data['data'].get('contact_id')

        bot_info = await motordb.db['bot'].find_one({ 'tenant_id': tenant_id, 'page_id': str(page_id), 'subscribed': True})

        contact = None
        if bot_info is not None:
            contact = await motordb.db['contact'].find_one({'tenant_id': tenant_id, 'bot_id': str(bot_info.get('_id')), 'page_id': str(page_id), 'id': psid})
        else:
            contact = await motordb.db['contact'].find_one({'tenant_id': tenant_id, 'page_id': str(page_id), 'id': psid})

        if contact is not None and contact.get('contact_id') is None:
            contact['contact_id'] = contact_id
            await motordb.db['contact'].update_one({"_id": ObjectId(contact["_id"])}, {'$set': contact})
        
        if contact is not None and contact.get('client_mac', None) is not None:
            # SEND TO WIFI
            wifi_data = {
                "client_mac": contact.get('client_mac'),
                "contact_id": contact_id,
                "name": contact.get('name'),
                "contact_name": contact.get("contact_name")
            }
            await send_contact_to_wifi(request, tenant_id, wifi_data)

    return json({
        'message': 'success'
    })


async def send_contact_to_wifi(request, tenant_id, data):
    # SEND TO WIFI
    URL = app.config.get('UPGO_WIFI_URL') + '/api/v1/contact/hook'
    headers = {
        "Content-Type": "application/json"
    }
    wifi_data = {
        "event_id": 1,
        "timestamp": now_timestamp(),
        "tenant_id": tenant_id,
        "data": data
    }
    response = requests.post(URL, data=ujson.dumps(wifi_data), headers=headers)

    WIFI_V1_URL = 'https://wifi.upgo.vn/api/v1/contact/hook'
    response = requests.post(WIFI_V1_URL, data=ujson.dumps(wifi_data), headers=headers)


