from datetime import datetime
from bson.objectid import ObjectId
from application.server import app
from application.database import motordb
from application.common.helpers import now_timestamp, merge_objects
from application.controllers.tenant import set_tenant
from application.client import HTTPClient

one_hour = 60 * 60 * 1000

async def record_messaging_session(bot_info, sender, timestamp, type):
    try:
        if bot_info is None or sender is None:
            return

        current_session = await motordb.db['messaging_session'].find_one({'page_id': bot_info['page_id'], 'page_scoped_id': sender['id'], 'end_time': {'$gt': (now_timestamp() - one_hour)}})

        if current_session is not None:
            if type == "message":
                current_session['end_time'] = timestamp if timestamp is not None else now_timestamp()

                if bot_info['page_id'] != sender['id']:
                    current_session['last_sent'] = timestamp if timestamp is not None else now_timestamp()

            elif type == "read":
                current_session['last_seen'] = timestamp if timestamp is not None else now_timestamp()

            await motordb.db['messaging_session'].update_one({'_id': ObjectId(current_session['_id'])}, {'$set': current_session})

        else:
            current_session = {
                'page_scoped_id': sender['id'],
                'detected_type': None,
                'detection': {},
                'started_time': timestamp if timestamp is not None else now_timestamp(),
                'end_time': timestamp if timestamp is not None else now_timestamp(),
                'last_seen': None,
                'last_sent': None,
                'page_id': bot_info['page_id'],
                'bot_id': str(bot_info['_id']),
                'tenant_id': bot_info['tenant_id']
            }
            if type == "message":
                current_session['end_time'] = timestamp if timestamp is not None else now_timestamp()
            await motordb.db['messaging_session'].insert_one(current_session)

            # SEND TO CRM CHAT SESSION
            # chat_session_data = {
            #     'psid': sender['id'],
            #     'name': sender.get('name'),
            #     'timestamp': timestamp if timestamp is not None else now_timestamp(),
            #     'page_id': bot_info['page_id'],
            #     'page_name': bot_info.get('page_name'),
            #     'bot_id': str(bot_info['_id']),
            #     'tenant_id': bot_info['tenant_id']
            # }
            # await HTTPClient.post('https://devcrm.upgo.vn/api/v1/contact_interactive/receive', chat_session_data)

    except:
        pass


async def update_session_detection(page_id, sender, type, data):

    current_session = await motordb.db['messaging_session'].find_one({'page_id': page_id, 'page_scoped_id': sender['id'], 'end_time': {'$gt': (now_timestamp() - one_hour)}})
    if current_session is not None:
        current_session['detected_type'] = type
        current_session['detection'] = merge_objects(data, current_session.get('detection', {}), False)

        await motordb.db['messaging_session'].update_one({'_id': ObjectId(current_session['_id'])}, {'$set': current_session})



async def get_session_detection(page_id, sender, type=None):

    query = {'page_id': page_id, 'page_scoped_id': sender['id'], 'end_time': {'$gt': (now_timestamp() - one_hour)}}
    if type is not None:
        query['detected_type'] = type

    current_session = await motordb.db['messaging_session'].find_one(query)

    if current_session is not None:
        detection = current_session.get('detection', {})
        result = detection
        if detection.get('datetime', None) is not None:
            if detection['datetime'].get('value', None) is not None:
                # 2019-05-18T12:00:00.000+07:00
                exact_time = detection['datetime']['value']
                exact_time = exact_time[:exact_time.find('.')]
                exact_datetime = datetime.strptime(exact_time, '%Y-%m-%dT%H:%M:%S')
                formated_time = datetime.strftime(exact_datetime, '%Y-%m-%d %H:%M:%S')
                result['order_time'] = formated_time
            elif detection['datetime'].get('values', None) is not None and len(detection['datetime']) > 0:
                from_time = detection['datetime']['values'][0]['from']['value']
                to_time = detection['datetime']['values'][0]['to']['value']
                
                # 2019-05-18T00:00:00.000+07:00
                from_time = from_time[:from_time.find('.')]
                to_time = to_time[:to_time.find('.')]
                from_datetime = datetime.strptime(from_time, '%Y-%m-%dT%H:%M:%S')
                to_datetime = datetime.strptime(to_time, '%Y-%m-%dT%H:%M:%S')
                formated_from = datetime.strftime(from_datetime, '%Y-%m-%d %H:%M:%S')
                formated_to = datetime.strftime(to_datetime, '%Y-%m-%d %H:%M:%S')
                result['order_time'] = formated_from + " - " + formated_to
        
        return result

    return None