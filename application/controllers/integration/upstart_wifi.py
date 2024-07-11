from copy import deepcopy
from datetime import datetime
from gatco.response import json
from bson.objectid import ObjectId
from application.extensions import apimanager
from application.server import app
from application.database import motordb
from application.controllers.tenant import set_tenant
from application.common.helpers import now_timestamp, merge_objects
from application.common.constants import ERROR_MSG, ERROR_CODE, STATUS_CODE


UPGO_TOKEN_FOR_CRM = 'B4E5NDLUS3FCK4GTAVHSOMER42BDU5YVZ26D6IX4BI6LCS4SDRA7JVODNQHNL5OADKT9SWJU5FLNDW6HTME379M0PTTG47G8IGNG2XGDISRMEN9DZD6DSZJ7I3DT007O'
UPGO_TOKEN_FOR_WIFI = 'GjvQc2xZUYEjNdyX1KNe0HoHuZqMK6deezUgpi394ygGzFtqf4u3AIBSxPu5LxaPUUU90N9T9fpyIGOMy6FYD6G0LYUlmU06CI4tk1aj4nIDTkffhI4KFyyenipz0ett'

def verify_token(request):
    token = request.headers.get('UPSTART-TOKEN', None)
    if token != UPGO_TOKEN_FOR_CRM and token != UPGO_TOKEN_FOR_WIFI:
        return json({
            "error_code": ERROR_CODE['AUTH_ERROR'],
            "error_message": ERROR_MSG['AUTH_ERROR']
        }, status=STATUS_CODE['AUTH_ERROR'])


@app.route('api/v1/integration/wifi/contact/info', methods=['GET'])
async def wifi_get_contact_info(request):
    verify_token(request)

    tenant_id = request.args.get('tenant_id')
    client_mac = request.args.get('client_mac')

    bot_list = motordb.db['bot'].find({'tenant_id': tenant_id, 'active': True, 'subscribed': True})

    # activated_bots = []
    activated_bot_ids = []
    async for bot in bot_list:
        # activated_bots.append(bot)
        activated_bot_ids.append(str(bot['_id']))

    contact_info_by_mac = motordb.db['contact'].find({
        'bot_id': {'$in': activated_bot_ids},
        'client_mac': client_mac
    })

    contact_info = None

    index = 0
    async for contact in contact_info_by_mac:
        if index == 0:
            contact_info = {
                'client_mac': client_mac,
                'name': contact.get('name'),
                'first_name': contact.get('first_name'),
                'last_name': contact.get('last_name'),
                'phone': contact.get('phone'),
                'birthday': contact.get('birthday'),
                'gender': contact.get('gender'),
                'email': contact.get('email'),
                'profile_pic': contact.get('profile_pic'),
                'social_info': []
            }
        
        contact_info['social_info'].append({
            'id': contact.get('id'),
            'name': contact.get('name'),
            'page_id': contact.get('page_id'),
            'page_name': contact.get('page_name'),
            'client_mac': contact.get('page_name'),
            'first_name': contact.get('first_name'),
            'gender': contact.get('gender'),
            'phone': contact.get('phone'),
            'client_mac': contact.get('page_name')
        })
        index += 1

    return json(contact_info)


