import importlib
import ujson
import redis
from datetime import datetime
import time, copy, requests, traceback, json as json_load
from bson.objectid import ObjectId
from gatco.response import json, text, html
from application.extensions import apimanager
from application.client import HTTPClient
from application.database import motordb, logdb
from application.server import app
from application.bot import UpBot
from broadcast_queue.redis_queue import SimpleQueue
from broadcast_queue.tasks import broadcast_task
from application.common.helpers import now_timestamp, current_local_datetime, merge_objects
from application.common.constants import STATUS_CODE, ERROR_CODE, ERROR_MSG
from application.common.email import send_mail
from application.controllers.base import auth_func, verify_access_token
from application.controllers.facebook.base import pre_post_set_position, pre_get_many_order_by
from application.controllers.tenant import set_tenant, get_current_tenant_id
from application.controllers.facebook.block import handle_block
from application.controllers.facebook.message import broadcast_check_sent_message, broadcast_log_message

from application.config import Config


async def pre_verify_broadcast(data=None, **kw):
    if data is not None:
        if data.get('sent_time', None) is not None:
            return json({
                'ok': False
            }, status=STATUS_CODE['ERROR'])


@app.route('/api/v1/broadcast/send', methods=['OPTIONS', 'POST'])
async def send_now(request):
    #     broadcast_service = 'https://bot.upgo.vn/broadcast/api/v1/send'
    body_data = request.json
    broadcast_id = body_data.get('broadcast_id', None)

    if broadcast_id is not None:
        r = redis.StrictRedis.from_url(Config.QUEUE_REDIS_URI)
        queue = SimpleQueue(r, 'chatbot-broadcast')
        queue.enqueue(broadcast_task, body_data)

        broadcast = await motordb.db['broadcast'].find_one({'_id': ObjectId(broadcast_id)})
        broadcast['sent_time'] = now_timestamp()

        await motordb.db['broadcast'].update_one({'_id': ObjectId(broadcast_id)}, {'$set': broadcast})

        try:
            email = app.config.get('HOST_EMAIL', None)
            subject = "Broadcast Event"
            email_content = "Broadcast started at " + current_local_datetime().strftime('%Y-%m-%d %H:%M:%S') + "\n\
                BOT ID: "+str(broadcast['bot_id'])+"\n\
                ID: "+str(broadcast['_id'])+"\n\
                ======= "+str(now_timestamp())+" ======"

            # SEND MAIL NOTIFY
            await send_mail(email, subject, email_content)
        except:
            pass

        return json({
            'ok': True
        }, status=STATUS_CODE['OK'])
    return json({
        'ok': False
    }, status=STATUS_CODE['ERROR'])


@app.route('/api/v1/broadcast/subscription', methods=['POST'])
async def broadcast_request_subscription(request):
    #     verify_access_token(request)
    data = request.json
    broadcast_id = data["broadcast_id"]
    bot_id = data["bot_id"]

    if bot_id is not None and broadcast_id is not None:
        bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(bot_id)})
        if bot_info is None:
            return json({"error_message": "param error!", "error_code": "PARRAM_ERROR"}, status=520)

        messages = []
        cards = motordb.db['card'].find({'bot_id': bot_id, 'broadcast_id': broadcast_id}, sort=[('position', 1)])
        if cards is not None:
            async for card in cards:
                card_handler_name = "application.controllers.facebook.card." + \
                    card.get("type") + "_card"
                card_handler = None
                try:
                    card_handler = importlib.import_module(card_handler_name)
                except:
                    print('Can not load card_handler: ' + card_handler_name)
        #             card_handler = importlib.import_module(card_handler_name)
                if card_handler is not None:
                    message_json = await card_handler.create_message_broadcast(card)

                    messages.append(message_json)

        data_messages = {}
        data_messages['messages'] = messages

        resp_create_message = await HTTPClient.post(app.config.get("FACEBOOK_GRAPH_URL") + "me/message_creatives?access_token=" + bot_info['token'], data_messages, {})

        if resp_create_message is not None and resp_create_message.get('message_creative_id', None) is not None:
            message_creative_id = resp_create_message['message_creative_id']

            data_message_send_broadcast = {
                "message_creative_id": message_creative_id,
                "notification_type": "REGULAR",  # "<REGULAR | SILENT_PUSH | NO_PUSH>",
                "messaging_type": "MESSAGE_TAG",  # RESPONSE, UPDATE
                "tag": "CONFIRMED_EVENT_UPDATE" # "NON_PROMOTIONAL_SUBSCRIPTION|CONFIRMED_EVENT_UPDATE|POST_PURCHASE_UPDATE|ACCOUNT_UPDATE"
            }

            resp_send_broadcast = await HTTPClient.post(app.config.get("FACEBOOK_GRAPH_URL")+"me/broadcast_messages?access_token=" + bot_info['token'], data_message_send_broadcast, {})

            if (resp_send_broadcast is not None and "broadcast_id" in resp_send_broadcast):
                broadcast_info = await motordb.db['broadcast'].find_one({'_id': ObjectId(broadcast_id)})
                broadcast_info['sent_time'] = now_timestamp()
                broadcast_info['result'] = resp_send_broadcast
                broadcast_info['result']['message_creative_id'] = message_creative_id
                
                await motordb.db['broadcast'].update_one({'_id': ObjectId(broadcast_id)}, {'$set': broadcast_info})

            return json(resp_send_broadcast)
        else:
            return json(resp_create_message, status=520)
    else:
        return json({"error_message": "param error!", "error_code": "PARRAM_ERROR"}, status=520)


# API cu cua LY, de kiem tra lai xem co service nao dang dung hay ko?
@app.route('/api/v1/broadcast-request', methods=['POST'])
async def broadcast_request(request):
    verify_access_token(request)
    data = request.json
    if data["sendnow"] and data["payload"]:
        payloads = data["payload"]
        responses = []
        page_id = data["page_id"]

        this_bot = await motordb.db['bot'].find_one({'page_id': page_id})
#         bot = Bot(this_bot['token'])
        bot = UpBot(str(this_bot['_id']), this_bot['token'], api_version=app.config.get('FACEBOOK_API_VERSION', 3.2))
        for payload in payloads:
            result = bot.send_text_message(
                payload["reciever"], payload["text"])
            responses.append(result)
            time.sleep(1)
        return json({"result": responses})
    else:
        return json({"result": "param error!"})


@app.route('/api/v1/crm/broadcast/json', methods=['POST'])
async def send_broadcast_from_crm_json(request):
    verify_access_token(request)
    prams = request.json
    if prams is not None and 'page_id' in prams and "data" in prams:
        payloads = prams["data"]
        responses = []
        page_id = prams["page_id"]

        this_bot = await motordb.db['bot'].find_one({'page_id': page_id})
#         bot = Bot(this_bot['token'])
        bot = UpBot(str(this_bot['_id']), this_bot['token'], api_version=app.config.get('FACEBOOK_API_VERSION', 3.2))
        for payload in payloads:
            result = bot.send_text_message(
                payload["reciever"], payload["message"])
            responses.append(result)
            time.sleep(1)
        return json({"result": responses})
    else:
        return json({"result": "error"})


async def handle_schedule_broadcast(data=None, **kw):
    print("scheduling")
    # if data['schedule']:


@app.route("/api/v1/broadcast/delete")
async def delete_by_broadcast_id(request):
    broadcast_id = request.args.get('id', None)

    await logdb.db['card'].delete_many({'broadcast_id': broadcast_id})

    return json(None)


@app.route('/api/v1/broadcast/check-result', methods=['GET'])
async def check_broadcast_result(request):
    block_id = request.args.get('id')
    bot_id = request.args.get('bot_id')

    # QUERY FROM MESSAGE LOG
    message_log_sent_count = await logdb.db['message_log'].count_documents({"bot_id": bot_id, "block_id": block_id, "messaging_type": "broadcast_block"})
    success_sent_messages = logdb.db['message_log'].find({"bot_id": bot_id, "block_id": block_id, "messaging_type": "broadcast_card", "result.recipient_id": {'$ne': None}})

    unique_contact_message = []
    async for item in success_sent_messages:
        if item.get('contact_id', None) not in unique_contact_message:
            unique_contact_message.append(item.get('contact_id', None))

    succeeded_count = len(unique_contact_message)
    del unique_contact_message

    broadcast = await motordb.db['broadcast'].find_one({'bot_id': bot_id, '_id': ObjectId(block_id)})
    if broadcast is not None:
        if broadcast.get('recipients', None) is None or broadcast.get('recipients', None) == 0:
            broadcast['recipients'] = message_log_sent_count

        if broadcast.get('succeeded', None) is None or broadcast.get('succeeded', None) == 0:
            broadcast['succeeded'] = succeeded_count

        if broadcast.get('failed', None) is None or broadcast.get('failed', None) == 0:
            broadcast['failed'] = message_log_sent_count - succeeded_count

        await motordb.db['broadcast'].update_one({'_id': ObjectId(block_id)}, {'$set': broadcast})

    return json({
        'recipients': message_log_sent_count,
        'succeeded': succeeded_count,
        'failed': message_log_sent_count - succeeded_count
    })





# HANDLE BUSINESS TO SEND MESSAGE
@app.route('/broadcast/api/v1/send', methods=['GET', 'POST'])
async def send_broadcast(request):
    data = request.json
    bot_id = data.get("bot_id")
    broadcast_id = data.get("broadcast_id")

    try:
        this_bot = await motordb.db['bot'].find_one({"_id": ObjectId(bot_id)})

        if this_bot is not None:
            bot = UpBot(str(this_bot['_id']), this_bot['token'], api_version=10.0)
            page_id = this_bot.get("page_id")

            if (bot is not None) and (page_id is not None):
                broadcast = await motordb.db['broadcast'].find_one({'_id': ObjectId(broadcast_id)})

                loop_flag = True
                # while loop_flag == True:
                sent_messages = logdb.db['message_log'].find({'broadcast_id': broadcast_id})
                sent_contacts = []
                async for m in sent_messages:
                    sent_contacts.append(m['to']['page_scoped_id'])

                count_contacts = await motordb.db['contact'].count_documents({'bot_id': bot_id, 'reachable': True, 'id': {'$nin': sent_contacts}})
                if count_contacts is None or count_contacts <= 0:
                    loop_flag = False
                    return

                contacts = motordb.db['contact'].find({'bot_id': bot_id, 'reachable': True, 'id': {'$nin': sent_contacts}})
                async for contact in contacts:
                    time.sleep(random.randint(1,5))
                    try:
                        # CHECK SENT CONTACT
                        flag = await broadcast_check_sent_message(broadcast_id, contact)
                        if flag == True:
                            try:
                                await handle_block(bot, contact, {"block_id": str(broadcast["_id"]), "type": "broadcast"}, 0, 'broadcast_card')
                            except Exception:
                                txt = traceback.format_exc()
                                error = {
                                    'error_code': 'HANDLE_BLOCK_AFTER_CHECK',
                                    'error_message': txt
                                }
                                await broadcast_log_message(bot_id, broadcast_id, contact, None, {'error': error})

                    except Exception:
                        txt = traceback.format_exc()
                        error = {
                            'error_code': 'CHECK_SENT_ERROR',
                            'error_message': txt
                        }
                        await broadcast_log_message(bot_id, broadcast_id, contact, None, {'error': error})

    except:
        error = {
            'error_code': 'FUNCTION_EXCEPTION',
            'error_message': 'in for loop of contact error'
        }
        await broadcast_log_message(bot_id, broadcast_id, None, None, {'error': error})

    return json({"status": "OK"})



@app.route('/api/v1/broadcast/push', methods=['POST'])
async def push_broadcast(request):

    tenant_id = get_current_tenant_id(request)

    body_data = request.json
    headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
    }
    api = app.config.get('UPGO_AIRFLOW_LOCAL_URL') + "/api/experimental/dags/chatbot_broadcast/dag_runs"

    data = {
        'start_date': '2020-01-01T00:00:00+07:00',
        'conf': {
            'broadcast_id': body_data.get('broadcast_id'),
            'bot_id': body_data.get('bot_id'),
            'tenant_id': tenant_id
        }
    }
    result = requests.post(api, data=json_load.dumps(data), headers=headers)
    if result.status_code == 200:
        broadcast_id = body_data.get('broadcast_id')
        broadcast = await motordb.db['broadcast'].find_one({'_id': ObjectId(broadcast_id), 'bot_id': body_data.get('bot_id')})
        broadcast['sent_time'] = now_timestamp()
        # count expected contact will send
        contact_number = await motordb.db['contact'].count_documents({'bot_id': body_data.get('bot_id'), 'reachable': True})
        broadcast['recipients'] = contact_number
        await motordb.db['broadcast'].update_one({'_id': ObjectId(broadcast_id)}, {'$set': broadcast})

    return json({
        'ok': True
    })


@app.route('/api/v1/broadcast/get_contact_list')
async def get_broadcast_contact_list(request):

    tenant_id = request.args.get('tenant_id')
    bot_id = request.args.get('bot_id')
    broadcast_id = request.args.get('broadcast_id')
    page = int(request.args.get('page', 1))
    page_size = int(request.args.get('page_size', 100))

    if bot_id is None or broadcast_id is None:
        return json({
            'error_code': 'PARAMS_ERROR',
            'error_message': 'Params is missing'
        }, status=520)

    bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(bot_id), 'tenant_id': tenant_id})
    if bot_info is None:
        return json({
            'error_code': 'PARAMS_ERROR',
            'error_message': 'Params is missing'
        }, status=520)

    broadcast_info = None
    try:
        broadcast_info = await motordb.db['broadcast'].find_one({"_id": ObjectId(broadcast_id), "bot_id": bot_id})
    except:
        pass

    if broadcast_info is None:
        return json({
            'error_code': 'DATA_ERROR',
            'error_message': 'Broadcast is not exist'
        }, status=520)

    broadcast_info['_id'] = str(broadcast_info['_id'])
    
    broadcast_blocks_cursor = motordb.db['block'].find({"bot_id": bot_id, 'type': 'broadcast', 'broadcast_id': broadcast_id})
    blocks = []
    async for block in broadcast_blocks_cursor:
        broadcast_cards_cursor = motordb.db['card'].find({"bot_id": bot_id, 'broadcast_id': broadcast_id, 'block_id': str(block.get('_id'))})
        cards = []
        async for card in broadcast_cards_cursor:
            card['_id'] = str(card['_id'])
            cards.append(card)
        
        block['_id'] = str(block['_id'])
        block['cards'] = cards
        blocks.append(block)

    broadcast_info['blocks'] = blocks

    result = {
        'broadcast_info': broadcast_info,
        'contacts': []
    }

    use_time_condition = broadcast_info.get('use_time_condition')
    if use_time_condition is True:
        selector = {
            'bot_id': bot_id,
            'page_id': bot_info.get('page_id'),
            'reachable': True
        }
        if broadcast_info.get('target_from') is not None:
            selector['created_at'] = {'$gte': broadcast_info.get('target_from')}
        if broadcast_info.get('target_to') is not None:
            selector['created_at'] = {'$lte': broadcast_info.get('target_to')}

        contact_cusor = motordb.db['contact'].find(selector).limit(page_size).skip((page - 1) * page_size)
        async for contact in contact_cusor:
            contact['_id'] = str(contact['_id'])
            result['contacts'].append({
                '_id': str(contact['_id']),
                'first_name': contact.get('first_name', ''),
                'last_name': contact.get('last_name', ''),
                'id': contact['id'],
                'name': contact.get('name', ''),
                'contact_type': contact['contact_type'],
                'page_id': contact.get('page_id', None),
            })
    else:
        contact_cusor = motordb.db['contact'].find({'bot_id': bot_id, 'page_id': bot_info.get('page_id'), 'reachable': True}).limit(page_size).skip((page - 1) * page_size)
        async for contact in contact_cusor:
            contact['_id'] = str(contact['_id'])
            result['contacts'].append({
                '_id': str(contact['_id']),
                'first_name': contact.get('first_name', ''),
                'last_name': contact.get('last_name', ''),
                'id': contact['id'],
                'name': contact.get('name', ''),
                'contact_type': contact['contact_type'],
                'page_id': contact.get('page_id', None),
            })

    return json(result)


async def pre_get_many_broadcast_order(search_params=None, **kw):
    search_params["order_by"] = [{"created_at": -1}, {"sent_time": 1}]


async def pre_process_delete_broadcast(request=None, instance_id=None, **kw):
    if instance_id is not None:
        # CHECK BROADCAST INFO IS ALLOWED TO DELETE
        broadcast_info = await motordb.db['broadcast'].find_one({'_id': ObjectId(instance_id)})

        if broadcast_info is not None and broadcast_info.get('sent_time') is not None and broadcast_info.get('sent_time', 0) > 0:
            return json({
                "error_code": "DELETE_FAILED",
                "error_message": "Không thể xoá dữ liệu này!"
            })

        await motordb.db['block'].delete_many({'broadcast_id': instance_id})
        await motordb.db['card'].delete_many({'broadcast_id': instance_id})


async def post_process_get_broadcast(request=None, instance_id=None, result=None, **kw):
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


apimanager.create_api(collection_name='broadcast',
    methods=['GET', 'POST', 'DELETE', 'PUT'],
    url_prefix='/api/v1',
    preprocess=dict(
        GET_SINGLE=[auth_func],
        GET_MANY=[auth_func, pre_get_many_broadcast_order],
        POST=[auth_func, set_tenant,
            pre_post_set_position, pre_verify_broadcast],
        PUT_SINGLE=[auth_func, pre_verify_broadcast],
        DELETE_SINGLE=[pre_process_delete_broadcast],
    ),
    postprocess=dict(
        POST=[],
        GET_SINGLE=[post_process_get_broadcast],
        GET_MANY=[post_process_get_broadcast]
    )
)
