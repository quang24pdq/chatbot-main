import time, requests, ujson
from copy import deepcopy
from datetime import datetime
from gatco.response import json
from bson.objectid import ObjectId
from application.extensions import apimanager
from application.bot import UpBot
from application.server import app
from application.database import motordb
from application.controllers.tenant import set_tenant
from application.common.helpers import now_timestamp, merge_objects
from application.common.constants import ERROR_MSG, ERROR_CODE, STATUS_CODE
from application.controllers.facebook.message import create_message_log


UPGO_TOKEN_FOR_INSTANTPAGE = 'cOBL6hlAHWlEUuvROKxyBlGGVUr1iyjidKT7R2xmMJQx1bcDJA1bJyFugWloktwl3djJ6EVIdA33z6w7um63IBlOnu3vNnHHpOeliXRklLdLFzGZLCQh31WglPzZ04uf'

def verify_token(request):
    token = request.headers.get('UPSTART-TOKEN', None)
    if token != UPGO_TOKEN_FOR_INSTANTPAGE:
        return {
            "valid": False,
            "error_code": ERROR_CODE['AUTH_ERROR'],
            "error_message": ERROR_MSG['AUTH_ERROR'],
            "status": STATUS_CODE['AUTH_ERROR']
        }


@app.route('api/v1/integration/instantpage/contact/info', methods=['GET'])
async def get_contact_info_for_booking(request):
    auth = verify_token(request)
    if auth is not None and auth.get('valid', None) == False:
        return json({
            'error_code': auth.get('error_code'),
            'error_message': auth.get('error_message')
        }, status=auth.get('status'))


    bot_id = request.args.get('bot_id')
    page_scope_id = request.args.get('page_scope_id')

    bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(bot_id), 'active': True, 'subscribed': True})

    contact = await motordb.db['contact'].find_one({'bot_id': bot_id, 'id': page_scope_id})
    if contact is not None:
        result = {
            'page_scope_id': contact.get('id'),
            'name': contact.get('name'),
            'phone': contact.get('phone'),
            'gender': contact.get('gender'),
            'page_id': bot_info.get('page_id'),
            'page_name': bot_info.get('page_name'),
            'tenant_id': bot_info.get('tenant_id'),
        }

        return json(result)

    return json(None)


@app.route('/api/v1/integration/instantpage/send_receipt', methods=['POST'])
async def send_receipt(request):
    auth = verify_token(request)
    if auth is not None and auth.get('valid', None) == False:
        return json({
            'error_code': auth.get('error_code'),
            'error_message': auth.get('error_message')
        }, status=auth.get('status'))

    body_data = request.json
    if body_data is None:
        return json({
            'error_code': ERROR_CODE['ARGS_ERROR'],
            'error_message': ERROR_MSG['ARGS_ERROR']
        }, status=STATUS_CODE['ARGS_ERROR'])

    bot_id = body_data.get('bot_id')
    data = body_data.get('data')

    bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(bot_id), 'active': True, 'subscribed': True})

    if bot_info is not None:
        headers = {
            "Content-Type": "application/json"
        }
        send_api = app.config.get('FACEBOOK_GRAPH_URL') + bot_info.get('page_id') + '/messages?access_token=' + bot_info['token']
        response = requests.post(send_api, data=ujson.dumps(data), headers=headers)
        if response.status_code == 200:
            result = response.json()
            return json({
                'tracking_id': None,
                'result': result
            })

    return json({
        'error_code': 'ERROR',
        'error_message': 'Error'
    }, status=520)
