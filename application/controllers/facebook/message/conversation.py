import redis

from application.client import HTTPClient
from gatco.response import json, text, html
from application.database import motordb
from application.server import app
from bson.objectid import ObjectId
from application.client import HTTPClient
from broadcast_queue.redis_queue import SimpleQueue
from broadcast_queue.tasks import loadcontact_task
from application.common.constants import STATUS_CODE, ERROR_CODE, ERROR_MSG
from application.common.helpers import now_timestamp, merge_objects

from application.bot import UpBot

# {
#     "data": [
#         {
#             "id": "t_10212365996339387",
#             "senders": {
#                 "data": [
#                   {
#                       "name": "Hai Yen",
#                       "email": "2906894999322425@facebook.com",
#                       "id": "2906894999322425"
#                   },
#                     {
#                       "name": "Góc Hà Nội 259 Tô Hiệu-Cầu Giấy.",
#                       "email": "1579714735684475@facebook.com",
#                       "id": "1579714735684475"
#                   }
#                 ]
#             }
#         }
#     ],
#     "paging": {
#         "cursors": {
#             "before": "QVFIUk1pWGFPTEktZAmpscnAwOFhRdG1TeUt3UE9tQS1zZAW44b1pwb3ZApeFFibjZAOaGp2TkY0N1R4NF9rQkd6ZAVM0ZAGhUMjBjVERoQ0RWZAFFPUWYwZA1NmbC1nNVB3QTlITXI3M1JCbU9iWVhtMnJn",
#             "after": "QVFIUmlwcFA5VEZAqa1ZAWOXZAHQTZAZAUXRONUhyY2JBTEZAVS2liLS1DNFJQWW1EZAGctNEduS0FaS1FtSkZAFY2RGRndFNTJXTkxsS0UwQXZAJY19MTmtlbklONE9kQ05DM2RweEpfTWQyWDlnRWkwUkV6bXpsTUxsa01xU2tXRkd6TjJTeGMy"
#         },
#         "next": "https://graph.facebook.com/v3.3/1579714735684475/conversations?access_token=EAAbxuhuFECgBAOZBcnz7Eei0lCOjlPnmnxZBgWjsZAZBWV4YtUPj2lbs3UcZBzLLuq87CYqzBvcgtAOgH1MHKAaFo4eTOpSGEO9X2cTEUO87v9w0qNArz0OOUbs6oxoDTPoGT6ZB9sQKgBX9iKUZApqLisHZCjrjw3cOKMhI1S7i3jBSakStZAlUzXO1exZAY6R1ZAVJA07M1sXqwZDZD&pretty=0&fields=id%2Csenders&limit=100&after=QVFIUmlwcFA5VEZAqa1ZAWOXZAHQTZAZAUXRONUhyY2JBTEZAVS2liLS1DNFJQWW1EZAGctNEduS0FaS1FtSkZAFY2RGRndFNTJXTkxsS0UwQXZAJY19MTmtlbklONE9kQ05DM2RweEpfTWQyWDlnRWkwUkV6bXpsTUxsa01xU2tXRkd6TjJTeGMy"
#     }
# }


@app.route('/api/v1/conversation/scan', methods=['OPTIONS', 'POST'])
async def scan_conversation(request):
    body_data = request.json  # bot_id

    if body_data is not None:
        r = redis.StrictRedis.from_url(app.config.get('QUEUE_REDIS_URI', None))
        queue = SimpleQueue(r, 'chatbot-conversation')
        queue.enqueue(loadcontact_task, body_data)

        return json({
            'ok': True
        }, status=STATUS_CODE['OK'])
    return json({
        'ok': False
    }, status=STATUS_CODE['ERROR'])


@app.route("/api/v1/conversation/get_detail")
async def get_detail(request):
    conversation_id = request.args.get("id")
    fb_api = app.config.get('FACEBOOK_GRAPH_URL') + conversation_id + "?fields=participants,senders,link,is_subscribed,messages"

    headers = {
        'Content-Type': 'application/json'
    }
    results = await HTTPClient.get(fb_api, {'token': ''}, headers=headers)

    return results


# HANDLE BUSINESS OF SCAN CONVERSATION
@app.route("/conversation/get_all", methods=["POST"])
@app.route("/api/v1/conversation/get_all", methods=["POST"])
async def get_conversations(request):
    body_data = request.json
    bot_id = body_data.get('bot_id', None)

    bot_info = await motordb.db['bot'].find_one({"_id": ObjectId(bot_id)})
    if bot_info is None:
        return json({
            'ok': False,
            'error': 'bot info is not found'
        }, status=524)

    page_id = bot_info.get("page_id", None)
    token = bot_info.get("token", None)

    if page_id is None:
        return json({
            'ok': False,
            'error': 'page id is none'
        }, status=524)

    bot = UpBot(str(bot_info['_id']), token, api_version=10.0)
    fb_api = app.config.get('FACEBOOK_GRAPH_URL', '') + page_id + '/conversations?access_token=' + token + '&fields=id,senders,updated_time&limit=50&pretty=0'

    headers = {
        'Content-Type': 'application/json'
    }
    result = {
        'paging': {
            'next': fb_api
        }
    }

    counter = 0
    while result is None or result['paging'].get('next', None) is not None:
        counter += 1
        URL = result['paging'].get('next', None)
        if URL is not None:
            result = await HTTPClient.get(URL, {}, headers=headers)
            print("counter =====> ", counter)
            # print ("result <><><> ", result)
            # scan contact
            for conversation in result['data']:
                updated_at = None
                if conversation.get('updated_time', None) is not None:
                    try:
                        updated_at = datetime.strptime(conversation['updated_time'], "%Y-%m-%dT%H:%M:%S%z").timestamp()
                        print("======> updated_at <=====", updated_at)
                    except:
                        pass
                if conversation.get('senders', None) is not None and conversation['senders'].get('data', None) is not None and\
                        isinstance(conversation['senders']['data'], list):
                    for sender in conversation['senders']['data']:
                        if sender.get('id', None) is not None and sender['id'] != page_id and\
                                (sender.get('name', None) is not None and sender['name'] != 'Facebook User'):

                            contact_info = await motordb.db['contact'].find_one({'bot_id': bot_id, 'id': sender['id']})
                            if contact_info is None:
                                # create new contact
                                info = bot.get_user_info(sender['id'])
                                new_contact = {}
                                if info is not None:
                                    print("loading info: ", info)
                                    new_contact = info

                                contact = merge_objects({
                                    'id': sender['id'],
                                    'name': sender.get('name', None),
                                    'email': sender.get('email', None),
                                    'contact_type': 'facebook_psid',
                                    'source': 'message',
                                    '_current_input': {},
                                    'last_sent': None,
                                    'last_seen': None,
                                    'interacted': True,
                                    'reachable': True,
                                    'page_id': page_id,
                                    'bot_id': bot_id,
                                    'created_at': updated_at,
                                    'updated_at': updated_at
                                }, new_contact, False)
                                # save contact
                                await motordb.db['contact'].insert_one(contact)
        else:
            result = None

    return json({
        'ok': True
    })


@app.route('/api/v1/conversation/get_next', methods=['POST'])
async def get_next_page_conversation(request):

    body_data = request.json
    bot_id = body_data.get('bot_id', None)
    next = body_data.get("next", None)

    bot_info = await motordb.db['bot'].find_one({"_id": ObjectId(bot_id)})
    if bot_info is None:
        return json({
            'ok': False,
            'error': 'bot info is not found'
        })

    page_id = bot_info.get("page_id", None)
    token = bot_info.get("token", None)
    if page_id is None or token is None:
        return json({
            'ok': False
        })
    
    bot = UpBot(str(bot_info['_id']), token, api_version=app.config.get('FACEBOOK_API_VERSION', 7.0))

    if next is None:
        next = app.config.get('FACEBOOK_GRAPH_URL', '') + page_id + '/conversations?access_token=' + token + '&fields=id,senders,updated_time&limit=50&pretty=0'

    headers = {
        'Content-Type': 'application/json'
    }
    result = await HTTPClient.get(next, {}, headers=headers)
    for conversation in result['data']:
        updated_at = now_timestamp()
        if conversation.get('updated_time', None) is not None:
            try:
                updated_at = datetime.strptime(conversation['updated_time'], "%Y-%m-%dT%H:%M:%S%z").timestamp()
                print("======> updated_at <=====", updated_at)
            except:
                pass
        if conversation.get('senders', None) is not None and conversation['senders'].get('data', None) is not None and\
            isinstance(conversation['senders']['data'], list):
            for sender in conversation['senders']['data']:
                if sender.get('id', None) is not None and sender['id'] != page_id and\
                        (sender.get('name', None) is not None and sender['name'] != 'Facebook User'):

                    contact_info = await motordb.db['contact'].find_one({'bot_id': bot_id, 'id': sender['id']})
                    if contact_info is None:
                        # create new contact
                        info = bot.get_user_info(sender['id'])
                        new_contact = {}
                        if info is not None:
                            print("loading info: ", info)
                            new_contact = info

                        contact = merge_objects({
                            'id': sender['id'],
                            'name': sender.get('name', None),
                            'email': sender.get('email', None),
                            'contact_type': 'facebook_psid',
                            'source': 'message',
                            '_current_input': {},
                            'last_sent': None,
                            'last_seen': None,
                            'interacted': True,
                            'reachable': True,
                            'page_id': page_id,
                            'bot_id': bot_id,
                            'created_at': updated_at,
                            'updated_at': updated_at
                        }, new_contact, False)
                        # save contact
                        await motordb.db['contact'].insert_one(contact)

    return json({
        "bot_id": bot_id,
        "next": result.get("next")
    })
