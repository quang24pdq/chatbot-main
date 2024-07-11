from datetime import datetime
import requests, ujson
from copy import deepcopy
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
    get_days_from_date, get_utc_from_local_datetime, convert_unsigned_vietnamese
from application.common.file_helper import download_file
from application.common.email import send_mail

from application.controllers.facebook.base import subscribe_get_start_button, pre_post_set_position
from application.controllers.facebook.persistent_menu import subcribe_persistent_menu
from application.controllers.tenant import set_tenant, get_current_tenant_id
from application.common.helpers import merge_objects, convert_template
from application.common.file_helper import read_template
from application.controllers.user import get_current_user

#
# FLOW:
#  CREATE BOT -> WITH DEFAULT DATA OR TEMPLATE OPTION
#  WHEN SUBSCRIBED PAGE -> GET PAGE INFO -> UPDATE BOT -> SEND PERSISTENNT MENU, GET START TO FACEBOOK
#


async def load_template(request, template_data, bot_id, page_info):
    tenant_id = get_current_tenant_id(request)

    if app.config.get('APP_MODE') == 'development':
        tenant_id = 'demo'

    bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(bot_id)})
    if bot_info is None:
        return
    bot_info['bot_name'] = bot_info['name']
    bot_info['bot_id'] = bot_info['_id']
    del bot_info['_id']
    del bot_info['name']
    if 'token' in bot_info:
        del bot_info['token']
    if 'page_acccess_token' in bot_info:
        del bot_info['page_acccess_token']
    if 'page_id' in bot_info:
        del bot_info['page_id']
    if 'page_name' in bot_info:
        del bot_info['page_name']

    bot_info['timestamp'] = now_timestamp()
    to_translate_tpl_data = merge_objects(page_info, bot_info)

    template_to_string = str(template_data)
    template_string = convert_template(template_to_string, to_translate_tpl_data)
    template = ujson.loads(template_string)

    template_payload_map = {}

    if 'structure' in template and template['structure'] is not None:
        if 'groups' in template['structure'] and isinstance(template['structure']['groups'], list):
            for g in template['structure']['groups']:
                group_info = deepcopy(g)
                blocks = group_info.get('blocks')
                if '_id' in group_info:
                    del group_info['_id']
                if 'blocks' in group_info:
                    del group_info['blocks']
                
                group_info['bot_id'] = str(bot_info['bot_id'])
                group_info['tenant_id'] = tenant_id
                group_result = await motordb.db['group'].insert_one(group_info)

                if group_result is not None and isinstance(blocks, list):
                    for b in blocks:
                        block_info = deepcopy(b)
                        cards = block_info.get('cards')
                        if '_id' in block_info:
                            del block_info['_id']
                        if 'cards' in block_info:
                            del block_info['cards']

                        block_payload = block_info.get('payload')
                        if block_payload is None:
                            block_payload = convert_unsigned_vietnamese(block_info.get('name')).lower().replace(" ", "_")

                        block_info['payload'] = block_payload
                        block_info['group_id'] = str(group_result.inserted_id)
                        block_info['bot_id'] = str(bot_info['bot_id'])
                        block_info['tenant_id'] = tenant_id
                        if template_payload_map.get(block_payload, None) is not None:
                            block_info['_id'] = template_payload_map[block_payload]
                        block_result = await motordb.db['block'].insert_one(block_info)

                        if template_payload_map.get(block_payload, None) is None:
                            template_payload_map[block_payload] = block_result.inserted_id

                        if block_result is not None and block_result.inserted_id is not None and isinstance(cards, list):
                            # CREATE CARDS
                            for card in cards:
                                if '_id' in card:
                                    del card['_id']
                                card['block_id'] = str(block_result.inserted_id)
                                card['bot_id'] = str(bot_info['bot_id'])
                                card['tenant_id'] = tenant_id

                                if card.get('type') == 'gotoblock':
                                    gotoblock = card['blocks'][0] if isinstance(card['blocks'], list) and len(card['blocks']) > 0 else None
                                    if gotoblock is not None and gotoblock.get('payload') is not None:
                                        # FIND BLOCK WILL GO TO
                                        
                                        goto_block_id = None
                                        if template_payload_map.get(gotoblock.get('payload')) is not None:
                                            goto_block_id = template_payload_map[gotoblock.get('payload')]
                                        else:
                                            goto_block_id = ObjectId()
                                            template_payload_map[gotoblock.get('payload')] = goto_block_id
                                            
                                        if goto_block_id is not None:
                                            card['blocks'] = [{
                                                "_id": str(goto_block_id),
                                                "payload": gotoblock.get('payload'),
                                                "name": gotoblock.get('name')
                                            }]
                                
                                will_save_card_buttons = []
                                card_buttons = card.get('buttons')
                                if isinstance(card_buttons, list) and len(card_buttons) > 0:
                                    for button in card_buttons:
                                        if button.get('type') == 'blocks' or button.get('type') == 'postback' and\
                                            isinstance(button.get('blocks'), list) and len(button['blocks']) > 0:
                                            button_block_id = None
                                            if template_payload_map.get(button['blocks'][0].get('payload')) is not None:
                                                button_block_id = template_payload_map[button['blocks'][0].get('payload')]
                                            else:
                                                button_block_id = ObjectId()
                                                template_payload_map[button['blocks'][0].get('payload')] = button_block_id

                                            copied_button = deepcopy(button)
                                            copied_button['blocks'][0]['_id'] = str(button_block_id)
                                            will_save_card_buttons.append(copied_button)
                                        else:
                                            will_save_card_buttons.append(button)


                                card['buttons'] = will_save_card_buttons
                                card_result = await motordb.db['card'].insert_one(card)

    setup_ai = template.get('setup_ai')
    if setup_ai is not None:
        if 'rules' in setup_ai and isinstance(setup_ai.get('rules'), list):
            for rule in setup_ai['rules']:
                rule_info = deepcopy(rule)
                if '_id' in rule_info:
                    del rule_info['_id']

                if rule_info.get('type') == 'block' and rule_info.get('block') is not None:
                    rule_block = rule_info.get('block')
                    if rule_block.get('payload') is not None:
                        # FIND EXIST BLOCK BY PAYLOAD
                        exist_block = await motordb.db['block'].find_one({'bot_id': str(bot_info['bot_id']), 'payload': rule_block.get('payload')})
                        if exist_block is not None:
                            rule_block['_id'] = str(exist_block.get('_id'))

                    rule_info['block'] = rule_block

                rule_info['bot_id'] = str(bot_info['bot_id'])
                rule_info['tenant_id'] = tenant_id
                rule_result = await motordb.db['rule'].insert_one(rule_info)


async def pre_get_many_bot(search_params=None, request=None, **kw):
    if app.config.get('APP_MODE') == 'development':
        if search_params is None or 'filters' not in search_params or search_params['filters'] is None:
            search_params = {
                'filters': {}
            }

        search_params["filters"] = search_params["filters"] if search_params["filters"] is not None else {}
        search_params["filters"]['tenant_id'] = {"$eq": 'demo'}

    else:
        current_tenant_id = get_current_tenant_id(request)
        if search_params is None or 'filters' not in search_params or search_params['filters'] is None:
            search_params = {
                'filters': {}
            }

        search_params["filters"] = search_params["filters"] if search_params["filters"] is not None else {}
        search_params["filters"]['tenant_id'] = {"$eq": current_tenant_id}


##
# HANDLE AFTER CREATE BOT SUCCESS
##
async def handle_create_bot(request=None, instance_id=None, result=None, **kw):
    if result is None:
        print("======handle_create_bot.result==None")
    else:
        template_data = read_template("default-template.json")
        if template_data is not None:
            await load_template(request, template_data, result.get("_id", None), None)



async def subscribed_setting(bot_info):
    token = bot_info['token']
    started_block = await motordb.db['block'].find_one({
        'bot_id': str(bot_info['_id']),
        'default': True,
        'payload': "welcome"
    })
    if started_block is None:
        started_block = await motordb.db['block'].find_one({
            'bot_id': str(bot_info['_id']),
            'default': True,
            'payload': True
        })
    if started_block is not None:
        # subscribe get_started payload
        await subscribe_get_start_button(started_block.get('_id'), token)

    await subcribe_persistent_menu(bot_info)


async def unsubscribed_setting(bot_info):
    pass


##
#
##
async def set_owner(request=None, data=None, **kw):
    if app.config.get('APP_MODE') == 'development':
        data["owner_id"] = 'demo'
    else:
        currentUser = auth.current_user(request)
        if currentUser is None:
            return json({"error_code": ERROR_CODE['AUTH_ERROR'], "error_message": ERROR_MSG['AUTH_ERROR']}, status=STATUS_CODE['AUTH_ERROR'])
        else:
            data["owner_id"] = currentUser["id"]


# PRE UPDATE BOT/SUBSCRIBED/UNSUBSCRIBED
async def pre_put_bot(request=None, instance_id=None, data=None, **kw):
    bot_id = instance_id
    tenant_id = get_current_tenant_id(request)

    page_id = data.get('page_id', None)
    action = data['action'] if 'action' in data and data['action'] is not None else None
    page_id = data['page_id'] if 'page_id' in data and data['page_id'] is not None else None
    token_short = data['token'] if 'token' in data and data['token'] is not None else None

    bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(bot_id)})

    if bot_info is None:
        return json({
            "error_code": ERROR_CODE['NOT_FOUND'],
            "error_message": "Not found Bot by owner"
        }, status=STATUS_CODE['ERROR'])
    else:
        headers={'Content-type': 'application/json'}
        if action == "subscribed" and 'subscribed' in bot_info and bot_info['subscribed'] == True and\
            page_id is not None and bot_info['page_id'] != page_id:
            return json({
                "ok": False,
                "error_code": ERROR_CODE['SUBSCRIBED_ERROR'],
                "error_message": "Page subscribed another Bot"
            }, status=STATUS_CODE['SUBSCRIBED_ERROR'])

        elif action == 'subscribed' and page_id is not None and token_short is not None:
            url = 'https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_secret=' + \
                app.config.get("FB_APP_SECRET_KEY")+'&client_id=' + \
                app.config.get("FB_APP_ID")+'&fb_exchange_token='+token_short
            result = await HTTPClient.get(url)

            if result is not None and "error_code" not in result:
                url_get_page_info = app.config.get("FACEBOOK_GRAPH_URL") + page_id +\
                    '?fields=id,name,picture.type(large),page_token&access_token=' + token_short
                result_page_info = await HTTPClient.get(url_get_page_info)
                bot_update = {
                    "page_id": page_id,
                    "token": result["access_token"],
                    "expired_time": now_timestamp() + ((result['expires_in'] * 1000) if result.get('expires_in', None) is not None else 90 * 86400000)
                }
                if result_page_info is not None and "error_code" not in result_page_info:
                    if "page_token" in result_page_info:
                        bot_update['page_access_token'] = result_page_info.get('page_token', '')
                    if "name" in result_page_info:
                        bot_update['page_name'] = result_page_info.get('name', '')
                        if 'name' not in bot_update or bot_update['name'] is None or bot_update['name'] == "Blank bot" or bot_update['name'] == "Bot trống":
                            bot_update['name'] = result_page_info.get('name', '')

                    if "picture" in result_page_info:
                        bot_update['page_profile_pic'] = result_page_info['picture']['data']['url']

                    bot_update['subscribed'] = True
                    bot_update['updated_at'] = now_timestamp()

                # await motordb.db['bot'].update_one({'_id': ObjectId(bot_id)}, {'$set': bot_update})

                page_logo_data = {
                    "file_url": bot_update.get('page_profile_pic'),
                    "path": None
                }
                file_download = await HTTPClient.post(app.config.get("UPGO_COMMON_SERVICE_URL") + "/api/v1/file/download", data=page_logo_data, headers=headers)
                bot_update['page_logo'] = file_download.get('url')

                await motordb.db['bot'].update_one({'_id': ObjectId(bot_id)}, {'$set': bot_update})

                bot_update['_id'] = bot_info['_id']

                # START JOB SCANNING CONVERSATION
                chatbot_scan_conversation  = {
                    "start_date": "2020-01-01T00:00:00+07:00",
                    "conf": {
                        "bot_id": bot_id,
                        "page_id": page_id,
                        "tenant_id": tenant_id,
                        "access_token": result['access_token']
                    }
                }
                await HTTPClient.post(app.config.get('UPGO_AIRFLOW_LOCAL_URL') + "/api/experimental/dags/chatbot_scan_conversation/dag_runs", data=chatbot_scan_conversation, headers=headers)
                
                # SUBSCRIBE INIT DATA
                await subscribed_setting(bot_update)

                bot_update['_id'] = str(bot_update['_id'])
                # await send_mail
                return json(bot_update, status=200)
            else:
                return json(result, status=STATUS_CODE['ERROR'])

        elif action == "refresh":
            url = 'https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_secret=' + \
                app.config.get("FB_APP_SECRET_KEY")+'&client_id=' + \
                app.config.get("FB_APP_ID")+'&fb_exchange_token='+token_short
            result = await HTTPClient.get(url)

            if result is not None and "error_code" not in result:
                url_get_page_info = app.config.get("FACEBOOK_GRAPH_URL") + page_id +\
                    '?fields=id,name,picture.type(large),page_token&access_token=' + token_short
                result_page_info = await HTTPClient.get(url_get_page_info)
                bot_update = {
                    "page_id": page_id,
                    "token": result["access_token"],
                    "expired_time": now_timestamp() + (result['expires_in'] * 1000)
                }
                if result_page_info is not None and "error_code" not in result_page_info:
                    if "page_token" in result_page_info:
                        bot_update['page_access_token'] = result_page_info.get('page_token', '')

                    if "picture" in result_page_info:
                        bot_update['page_profile_pic'] = result_page_info['picture']['data']['url']

                    bot_update['updated_at'] = now_timestamp()

                page_logo_data = {
                    "file_url": bot_update.get('page_profile_pic'),
                    "path": None
                }
                file_download = await HTTPClient.post(app.config.get("UPGO_COMMON_SERVICE_URL") + "/api/v1/file/download", data=page_logo_data, headers=headers)
                bot_update['page_logo'] = file_download.get('url')
                await motordb.db['bot'].update_one({'_id': ObjectId(bot_id)}, {'$set': bot_update})

                bot_update['_id'] = str(bot_update['_id'])
                return json(bot_update, status=200)

        elif action == "unsubscribed":
            # remove persistent maneu
            # await unsubscribed_setting(bot_info)
            bot_update = {
                "subscribed": False
            }
            await motordb.db['bot'].update_one({'_id': ObjectId(bot_id)}, {'$set': bot_update})

            # email = app.config.get('HOST_EMAIL', None)
            # subject = "[BOT Unsubscribed] Khách hàng đã ngắt kết nối page " + bot_info['page_name']
            # email_content = "Page " + bot_info['page_name'] + " đã bị ngắt kết nối.\n\
            #      Ngày: " + current_local_datetime().strftime('%Y-%m-%d %H:%M:%S')\
            #         + "(chú ý đặt lịch chăm sóc)\n\
            #             ------ Sent from UpBOT ------"

            # SEND MAIL NOTIFY
            # await send_mail(email, subject, email_content)

            return json({
                "ok": True
            })
    return json({})


async def update_user_attributes(bot_id, attribute):
    if bot_id is None or attribute is None:
        return None

    bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(bot_id)})
    original_attributes = bot_info.get('user_define_attribute', [])
    exist = False
    for _ in original_attributes:
        if _ == attribute:
            exist = True

    if exist == False:
        original_attributes.append(attribute)

        bot_info['user_define_attribute'] = original_attributes

        await motordb.db['bot'].update_one({'_id': ObjectId(bot_info.get('_id', None))}, {'$set': bot_info})
        return bot_info

    return bot_info



@app.route("/api/v1/bot/delete", methods=["DELETE"])
async def delete_bot(request):
    # await auth_func(request)
    current_user = auth.current_user(request)
    tenant_id = get_current_tenant_id(request)
    delete_mode = request.args.get("delete", None)

    if delete_mode != "force":
        if tenant_id is None or current_user is None:
            return json({
                "ok": False,
                "error_code": ERROR_CODE['PERMISSION_ERROR'],
                "error_message": ERROR_MSG['PERMISSION_ERROR']
            }, status=STATUS_CODE['AUTH_ERROR'])
    tenant_id = tenant_id if tenant_id is not None else request.args.get("tenant_id")
    owner_id = current_user.get("id", None) if current_user is not None else None
    bot_id = request.args.get("id", None)
    bot_info = await motordb.db['bot'].find_one({"_id": ObjectId(bot_id), "tenant_id": tenant_id})

    if delete_mode == "hard" or delete_mode == "force":
        # await unsubscribed_setting(bot_info)
        await motordb.db['bot'].delete_one({'_id': {'$eq': ObjectId(bot_info["_id"])}})
        await motordb.db['group'].delete_many({'bot_id': {'$eq': str(bot_info["_id"])}})
        await motordb.db['block'].delete_many({'bot_id': str(bot_info["_id"])})
        await motordb.db['card'].delete_many({'bot_id': str(bot_info["_id"])})
        await motordb.db['rule'].delete_many({'bot_id': {'$eq': str(bot_info["_id"])}})
        await motordb.db['persistent_menu'].delete_many({'bot_id': {'$eq': str(bot_info["_id"])}})
    else:
        if 'owner_id' in bot_info and bot_info['owner_id'] != owner_id:
            return json({
                "ok": False,
                "error_code": ERROR_CODE['PERMISSION_ERROR'],
                "error_message": "Bạn không có quyền xoá UpBOT này."
            }, status=STATUS_CODE['AUTH_ERROR'])
        # unsubscribe when deleting BOT
        # await unsubscribed_setting(bot_info)
        bot_info['token'] = None
        bot_info['page_id'] = None
        bot_info['active'] = False
        bot_info['subscribed'] = False
        await motordb.db['bot'].update_one({"_id": ObjectId(bot_info["_id"])}, {'$set': bot_info})

    previous_page_id = bot_info['page_id']
    previous_page_token = bot_info['token']
    return json({
        "ok": True,
        "bot_info": {
            "_id": str(bot_info['_id']),
            "page_id": previous_page_id,
            "page_name": bot_info['page_name'],
            "token": previous_page_token,
            "tenant_id": bot_info['tenant_id']
        }
    })


@app.route('/api/v1/bot/move', methods=["POST"])
async def move_bot(request):
    body_data = request.json
    bot_id = body_data.get('bot_id')
    move_from = get_current_tenant_id(request)
    move_to = body_data.get('to')

    return json({})


@app.route('/api/v1/page/like/count', methods=['GET'])
async def get_page_like(request):
    page_id = request.args.get('page_id', None)
    if page_id is None:
        return json({
            'likes': 0
        }) 
    now = now_timestamp()
    day7before = now - (86400000 * 14)

    likes = await motordb.db['page_log'].count_documents({
        'page_id': page_id,
        'action.verb': 'add',
        'action.item': 'like',
        # '$and': [
        #     {'timestamp': {'$gt': day7before}},
        #     {'timestamp': {'$lt': now}}
        # ]
    })

    print ("page/likes count ", likes)

    unlike = await motordb.db['page_log'].count_documents({
        'page_id': page_id,
        'action.verb': 'remove',
        'action.item': 'like',
        # '$and': [
        #     {'timestamp': {'$gt': day7before}},
        #     {'timestamp': {'$lt': now}}
        # ]
    })
    print ("page/unlike count ", unlike)

    return json({
        'likes': likes - unlike
    })


@app.route('/api/v1/page/reachable/count', methods=['GET'])
async def get_page_reachable(request):
    page_id = request.args.get('page_id', None)
    if page_id is None:
        return json({
            'reachables': 0
        })
    localNow = current_local_datetime()
    utcNow = get_utc_from_local_datetime(localNow)
    day7before = get_days_from_date(utcNow, 14)
    utc_now_timestamp = get_milisecond(utcNow)
    utc_day7before_timestamp = get_milisecond(day7before)

    reachable_contact = await motordb.db['contact'].count_documents({
        'page_id': page_id,
        'reachable': True
    })

    return json({
        'reachables': reachable_contact
    })


@app.route('/api/v1/bot/get_subscribed_bots', methods=['GET'])
async def get_subscribed_bots(request):
    # try:
    tenant_id = get_current_tenant_id(request)
    print ("tenant_id ", tenant_id)
    bots = motordb.db['bot'].find({'active': True, 'subscribed': True})
    results = []
    async for bot in bots:
        bot['_id'] = str(bot['_id'])

        if 'token' in bot:
            del bot['token']
        if isinstance(bot.get('created_at'), datetime):
            del bot['created_at']
        if isinstance(bot.get('updated_at'), datetime):
            del bot['updated_at']

        results.append(bot)

    return json(results)
    # except:
    #     return json([])





@app.route("/api/v1/bot/update/attrs", methods=["PUT"])
async def update_properties(request):
    data = request.json

    if data is None or '_id' not in data or data['_id'] is None:
        return json({"error_code": "", "error_message": ""}, status=520)

    bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(data['_id'])})

    if bot_info is not None:
        del data['_id']
        bot_info = merge_objects(data, bot_info, False)

        if 'wit' in data and data['wit'] is not None:
            wit_type = data['wit'].get('type', None)
            
            if wit_type is not None and wit_type == 'food_and_bar':
                wit_attributes = ['booking_flag', 'booking_for_people_number', 'booking_time', 'booking_requirements']
                available_attributes = bot_info.get('user_define_attribute', [])
                for _ in wit_attributes:
                    try:
                        if available_attributes.index(_) >= 0:
                            pass
                    except:
                        available_attributes.append(_)

                bot_info['user_define_attribute'] = available_attributes

        if 'user_define_attribute' in data and data['user_define_attribute'] is not None and isinstance(data['user_define_attribute'], list):
            available_attributes = bot_info.get('user_define_attribute', [])
            for _ in data['user_define_attribute']:
                try:
                    if available_attributes.index(_) >= 0:
                        pass
                except:
                    available_attributes.append(_)

            bot_info['user_define_attribute'] = available_attributes

        result = await motordb.db['bot'].update_one({"_id": ObjectId(bot_info.get("_id"))}, {'$set': bot_info})
        if result:
            return json({"ok": True, "message": "success"})
        return json({"ok": False, "error_code": ERROR_CODE['SERVER_ERROR'], "error_message": ERROR_MSG['SERVER_ERROR']}, status=STATUS_CODE['ERROR'])
    # except:
    #     return json({"error_code": "EXCEPTION", "error_message": "EXCEPTION"}, status=520)

        
@app.route('/api/v1/bot/clone', methods=['POST'])
async def clone_bot(request):
    data = request.json
    current_user = get_current_user(request)
    bot_id = data.get("bot_id", None)

    tenant_id = get_current_tenant_id(request)
    tenant_id = tenant_id if tenant_id is not None else data.get("tenant_id", None)
    if tenant_id is None:
        return json({
            "error_code": "INVALID_REQUEST",
            "error_message": "Invalid Request"
        })

    new_bot = None
    if bot_id is not None:
        bot = await motordb.db["bot"].find_one({"_id": ObjectId(bot_id)})

        if bot is not None:
            new_bot = deepcopy(bot)
            del new_bot['_id']
            new_bot['token'] = None
            new_bot['page_access_token'] = None
            new_bot['user_ids'] = []
            new_bot['page_id'] = None
            new_bot['page_name'] = None
            new_bot['user_define_attribute'] = []
            new_bot['name'] = new_bot['name'] + ' ' + 'copy'
            new_bot['subscribed'] = False
            new_bot['position'] = now_timestamp()
            new_bot['owner_id'] = current_user['id']
            new_bot['created_at'] = now_timestamp()
            new_bot['updated_at'] = now_timestamp()
            new_bot['tenant_id'] = tenant_id

            result_bot = await motordb.db['bot'].insert_one(new_bot)
            new_bot['_id'] = str(result_bot.inserted_id)

            if result_bot is None:
                return json({'error_message': 'Can not create bot'})

            persistentmenu = await motordb.db['persistent_menu'].find_one({'bot_id': bot_id})
            if persistentmenu is not None:
                p = deepcopy(persistentmenu)
                del p['_id']
                p['bot_id'] = str(result_bot.inserted_id)
                p['created_at'] = now_timestamp()
                p['updated_at'] = now_timestamp()
                p['tenant_id'] = tenant_id
                result_persistentmenu = await motordb.db['persistent_menu'].insert_one(p)
                if result_persistentmenu is None:
                    return json({'error_message', 'Can not create persistentmenu'})

            rule = motordb.db['rule'].find({'bot_id': bot_id})
            if rule is not None:
                async for r in rule:
                    new_rule = r
                    del new_rule['_id']
                    new_rule['bot_id'] = str(result_bot.inserted_id)
                    new_rule['created_at'] = now_timestamp()
                    new_rule['updated_at'] = now_timestamp()
                    new_rule['tenant_id'] = tenant_id

                    await motordb.db['rule'].insert_one(new_rule)


            group = motordb.db['group'].find({'bot_id': bot_id})
            async for g in group:
                new_group = deepcopy(g)
                del new_group['_id']
                new_group['bot_id'] = str(result_bot.inserted_id)
                new_group['created_at'] = now_timestamp()
                new_group['updated_at'] = now_timestamp()
                new_group['tenant_id'] = tenant_id

                result_group = await motordb.db['group'].insert_one(new_group)

                block = motordb.db['block'].find({'bot_id': bot_id, 'group_id': str(g['_id'])})
                if block is not None:
                    async for b in block:
                        new_block = deepcopy(b)
                        del new_block['_id']
                        new_block['bot_id'] = str(result_bot.inserted_id)
                        new_block['group_id'] = str(result_group.inserted_id)
                        new_block['created_at'] = now_timestamp()
                        new_block['updated_at'] = now_timestamp()
                        new_block['tenant_id'] = tenant_id

                        result_block = await motordb.db['block'].insert_one(new_block)

                        card = motordb.db['card'].find({'bot_id': bot_id, 'block_id': str(b['_id'])})    
                        if card is not None:
                            async for c in card:
                                new_card = deepcopy(c)
                                del new_card['_id']
                                new_card['bot_id'] = str(result_bot.inserted_id)
                                new_card['block_id'] = str(result_block.inserted_id)
                                new_card['created_at'] = now_timestamp()
                                new_card['updated_at'] = now_timestamp()
                                new_card['tenant_id'] = tenant_id

                                result_card = await motordb.db['card'].insert_one(new_card)
            
            feeds = motordb.db['feed_item'].find({'bot_id': bot_id})
            async for feed_item in feeds:
                new_feed = deepcopy(feed_item)
                del new_feed['_id']
                new_feed['bot_id'] = str(result_bot.inserted_id)
                new_feed['block_id'] = str(result_block.inserted_id)
                new_feed['created_at'] = now_timestamp()
                new_feed['updated_at'] = now_timestamp()
                new_feed['tenant_id'] = tenant_id

                feed_item_result = await motordb.db['feed_item'].insert_one(new_feed)
    # print('________________', new_bot)
    return json(new_bot)


@app.route('/api/v1/bot/rename', methods=["POST"])
async def rename_bot(request):
    data = request.json
    bot_id = data.get("bot_id", None)
    bot_name = data.get("bot_name", None)
    if bot_id is not None:
        query = {'_id': ObjectId(bot_id)}
        newvalues = {"$set": {"name": bot_name}}
        await motordb.db['bot'].update_one(query, newvalues)

    return json({"status": "success"})


async def set_default_data(data=None, **kw):  
    if data is not None:
        data['update_user_attributes'] = ['tenant_id', 'page_id', 'page_name', 'name', 'first_name', 'last_name', 'gender', 'phone', 'profile_pic', 'locale', 'timezone']


async def post_process_get_bot(request=None, instance_id=None, result=None, **kw):
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


@app.route('/bot/update')
async def manual_update_bot(request):
    bot_id = request.args.get('bot_id')
    subscribed = int(request.args.get('subscribed', 0))
    bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(bot_id)})

    if subscribed == 1:
        bot_info['subscribed'] = True
    else:
        bot_info['subscribed'] = False

    await motordb.db['bot'].update_one({'_id': ObjectId(bot_id)}, {'$set': bot_info})
    return json({"OK": True})


apimanager.create_api(collection_name='bot',
    methods=['GET', 'POST', 'DELETE', 'PUT'],
    url_prefix='/api/v1',
    preprocess=dict(
        POST=[auth_func, set_tenant, set_owner, pre_post_set_position, set_default_data],
        PUT_SINGLE=[auth_func, pre_put_bot],
        GET_SINGLE=[auth_func],
        GET_MANY=[auth_func, pre_get_many_bot],
        DELETE_SINGLE=[auth_func, delete_bot]
    ),
    postprocess=dict(
        POST=[handle_create_bot],
        GET_SINGLE=[post_process_get_bot],
        GET_MANY=[post_process_get_bot]
    )
)

apimanager.create_api(collection_name='page_log',
    methods=['GET', 'POST', 'DELETE', 'PUT'],
    url_prefix='/api/v1',
    preprocess=dict(
        POST=[auth_func, set_tenant, set_owner],
        PUT_SINGLE=[auth_func],
        GET_SINGLE=[auth_func],
        GET_MANY=[auth_func, pre_get_many_bot],
        DELETE_SINGLE=[auth_func]
    ),
    postprocess=dict(POST=[])
)
