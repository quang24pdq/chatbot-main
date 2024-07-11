import time
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


UPGO_TOKEN_FOR_BOOKING = '0guCXRtJWHnEUHWzenLzwidI7tp2a890csq09KzThNn1k7omj0MF8Pc36pW6oTUqbbe9LESQf4Fp1Tz8HbEEOExKThE7Zpm0qqXZSGDXA6apNAojBQNgk8O1ejZ3w9RK'


def verify_token(request):
    token = request.headers.get('UPSTART-TOKEN', None)
    if token != UPGO_TOKEN_FOR_BOOKING:
        return {
            "valid": False,
            "error_code": ERROR_CODE['AUTH_ERROR'],
            "error_message": ERROR_MSG['AUTH_ERROR'],
            "status": STATUS_CODE['AUTH_ERROR']
        }


@app.route('api/v1/integration/booking/contact/info', methods=['GET'])
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



@app.route('api/v1/integration/booking/send', methods=['POST'])
async def send_booking_requirements(request):
    auth = verify_token(request)
    if auth is not None and auth.get('valid', None) == False:
        return json({
            'error_code': auth.get('error_code'),
            'error_message': auth.get('error_message')
        }, status=auth.get('status'))

    data = request.json
    print ("data ", data)

    if data is None:
        return json({
            'error_code': ERROR_CODE['ARGS_ERROR'],
            'error_message': ERROR_MSG['ARGS_ERROR']
        }, status=STATUS_CODE['ARGS_ERROR'])
    bot_id = data.get('bot_id')
    page_scope_id = data.get('page_scope_id')
    messages = data.get('messages', None)

    if messages is not None:
        if bot_id is None or page_scope_id is None or messages is None or isinstance(messages, list) == False:
            return json({
                'error_code': ERROR_CODE['ARGS_ERROR'],
                'error_message': ERROR_MSG['ARGS_ERROR']
            }, status=STATUS_CODE['ARGS_ERROR'])
        bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(bot_id), 'active': True, 'subscribed': True})
        if bot_info is None:
            return json({
                'error_code': ERROR_CODE['NOT_FOUND'],
                'error_message': ERROR_MSG['NOT_FOUND']
            }, status=STATUS_CODE['NOT_FOUND'])

        bot = UpBot(str(bot_info['_id']), bot_info['token'], api_version=app.config.get('FACEBOOK_API_VERSION', 10.0))

        results = []
        for message in messages:
            text = message.get('text', None)
            if text is not None:
                result = bot.send_text_message(page_scope_id, text)
                results.append(result)
            time.sleep(1)

        log_id = await create_message_log(bot, {
            'id': bot_info.get('page_id')
        }, {
            'id': page_scope_id
        }, {
            'message': messages
        })

        return json({
            'tracking_id': str(log_id),
            'result': results
        })

    else:
        phone = data.get('phone')
        adult_people = data.get('adult_people')
        child_people = data.get('child_people')
        booking_date = data.get('booking_date')
        booking_time = data.get('booking_time')
        booking_note = data.get('booking_note')

        contact = await motordb.db['contact'].find_one({'id': page_scope_id, 'bot_id': bot_id})

        if contact is not None:
            contact['booking_phone'] = phone
            contact['adult_people'] = adult_people
            contact['child_people'] = child_people
            contact['booking_date'] = booking_date
            contact['booking_time'] = booking_time
            contact['booking_requirements'] = booking_note

            await motordb.db['contact'].update_one({'_id': ObjectId(contact["_id"])}, {'$set': contact})

        return json(None)





