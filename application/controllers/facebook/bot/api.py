from datetime import datetime
import requests, ujson
from copy import deepcopy
import json as json_load
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
from application.common.helpers import now_timestamp, get_milisecond, current_local_datetime,\
    get_days_from_date, get_utc_from_local_datetime, convert_template
from application.controllers.tenant import set_tenant, get_current_tenant_id
from application.controllers.user import get_current_user
from application.common.file_helper import read_template
from application.controllers.facebook.bot import load_template


@app.route('/api/v1/bot/get_subcribed_bots', methods=['POST'])
async def get_subcribed_bots(request):
    await auth_func(request)
    body_data = request.json
    cursor = motordb.db['bot'].find({
        'tenant_id': body_data.get('tenant_id'),
        'page_id': {
            "$in": body_data.get('page_ids')
        }
    })

    results = []
    if cursor is not None:
        async for bot in cursor:
            bot_update = deepcopy(bot)
            bot['_id'] = str(bot['_id'])
            has_change = False
            if isinstance(bot_update.get('created_at'), datetime):
                has_change = True
                del bot_update['created_at']
                del bot['created_at']

            if isinstance(bot_update.get('updated_at'), datetime):
                has_change = True
                bot_update['updated_at'] = now_timestamp()
                del bot['updated_at']

            if has_change == True:
                await motordb.db['bot'].update_one({'_id': bot_update.get('_id')}, {'$set': bot_update})

            results.append(bot)

    return json(results)


@app.route('/api/v1/bot/get_by_page_id', methods=['GET'])
async def get_bot_by_page_id(request):
    await auth_func(request)
    page_id = request.args.get('id')
    tenant_id = request.args.get('tenant_id')
    if page_id is None:
        return json({})

    body_data = request.json
    bot_info = await motordb.db['bot'].find_one({
        'tenant_id': tenant_id,
        'page_id': page_id
    })

    if bot_info is None:
        return json(None)
    bot_info['_id'] = str(bot_info['_id'])

    return json(bot_info)

@app.route('/api/v1/bot/get_by_bot_id', methods=['GET'])
async def get_bot_by_bot_id(request):
    await auth_func(request)
    bot_id = request.args.get('bot_id')
    print("bot_id : ", bot_id)

    body_data = request.json
    bot_info = await motordb.db['bot'].find_one({
        '_id': ObjectId(bot_id)
    })

    if bot_info is None:
        return json(None)
    bot_info['_id'] = str(bot_info['_id'])

    return json(bot_info)


@app.route('/api/v1/bot/create', methods=['POST'])
async def create_bot(request):
    tenant_id = get_current_tenant_id(request)
    current_user = get_current_user(request)
    if tenant_id is None or current_user is None:
        return json({
            'error_code': 'INVALID_REQUEST',
            'error_message': 'Thông tin yêu cầu không xác định'
        })
    
    body_data = request.json
    template = 'default'
    if body_data is not None:
        template = body_data.get('template', None)

    load_template_data = None
    if template == 'default':
        load_template_data = read_template("default-template.json")

    else:
        load_template_data = read_template(str(template) + ".json")

    if load_template_data is not None:
        try:
            template_to_string = str(load_template_data)
            template_string = convert_template(template_to_string, {})
            template_data = ujson.loads(template_string)

            if template_data is not None:
                new_bot = {
                    'name': template_data.get('name'),
                    'page_id': None,
                    'page_name': None,
                    'page_logo': None,
                    'token': None,
                    'page_access_token': None,
                    'page_profile_pic': None,
                    'update_user_attributes': ['page_id', 'page_name', 'name', 'first_name', 'last_name', 'gender', 'phone', 'profile_pic', 'locale', 'timezone'],
                    'position': now_timestamp(),
                    'active': True,
                    'created_at': now_timestamp(),
                    'business_line': template_data.get('business_line', None),
                    'owner_id': current_user.get('id'),
                    'tenant_id': tenant_id,
                }

                result = await motordb.db['bot'].insert_one(new_bot)
                bot_id = str(result.inserted_id)

                await load_template(request, load_template_data, bot_id, {})

                return json({
                    'id': str(bot_id)
                })
        except:
            pass

    return json({
        'error_code': 'UNKNOWN_ERROR',
        'error_message': 'Lỗi không xác định'
    })
