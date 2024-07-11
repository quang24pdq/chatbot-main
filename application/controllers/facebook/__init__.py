import ujson, random, time, requests
from copy import deepcopy
from math import floor
from datetime import datetime
from bson.objectid import ObjectId

from jinja2 import Template
from application.extensions import apimanager
from application.extensions import jinja
from application.extensions import auth

from gatco.response import json, text, html
from application.client import HTTPClient
from application.database import motordb, logdb
from application.server import app
from application.bot import UpBot

from application.common.helpers import convert_phone_number, check_text_rule, now_timestamp
from application.common.file_helper import download_file
from application.controllers.facebook.ai import handle_ai_rule
from application.controllers.facebook.block import handle_block
from application.controllers.facebook.contact.current_input import handle_current_contact_input, cancel_current_input,\
    update_current_input_blocks, reset_current_card
from application.controllers.facebook.contact import set_reachable_contact, set_last_read, update_contact,\
    load_contact_info
from application.controllers.facebook.contact.api import send_contact_to_wifi
from application.controllers.facebook.base import create_first_block
from application.common.constants import FB_HUB_VERIFY_TOKEN
from application.controllers.facebook.feed_item import feed_handler
from application.controllers.facebook.message.messaging_session import record_messaging_session
from application.controllers.facebook.message import create_message_log, check_processed_message


def verify_fb_token(request):
    hub_mode = request.args.get("hub.mode")
    hub_verify_token = request.args.get("hub.verify_token")
    hub_challenge = request.args.get("hub.challenge")
    if hub_verify_token == FB_HUB_VERIFY_TOKEN:
        return hub_challenge

    return text("Invalid verification token")


# HANDLE NORMAL MESSAGE
async def handle_message(request, bot, contact, message):
    # CHECK MESSAGE
    income_message = message.get('text', None)
    # HANDLE USER-INPUT FORM
    if income_message is not None:
        be_continue = await handle_current_contact_input(request, bot, contact, income_message)
        # print("be_continue ... ", be_continue)
        if be_continue is True:
            # HANDLE SETUP AI
            await handle_ai_rule(request, bot, contact, income_message)


# MAKE POSTBACK LOG AND CHECK DUPLICATE
async def check_processed_postback(event, message, contact):
    page_id = event.get("id", None)
    messaging_time = message['timestamp'] * 1000 if message.get('timestamp', None) is not None else now_timestamp()
    contact_id = contact.get("id", None)

    if (page_id is not None) and (messaging_time is not None) and (contact_id is not None):
        key = str(page_id) + "_" + str(contact_id) + "_" + str(messaging_time)
        
        postback_log = await motordb.db['postback_log'].find_one({'_id': key})
        if postback_log is None:
            postback_log = {
                "_id": key,
                "create_at": now_timestamp(),
                "messaging_timestamp": messaging_time,
                "event": event,
                "contact_id": contact.get("id"),
                "contact_name": contact.get("name", '')
            }
            await motordb.db['postback_log'].insert_one(postback_log)
            return False
    return True


# HANDLE MESSENGER BUSINESS
async def handle_bot_request(request):
    data = request.json
    if data is not None:
        data_clone = deepcopy(data)
    print('=============================================================================================')
    print('EVENT DATA: ', data)
    print('=============================================================================================')
    for event in data.get('entry', []):
        # process for message text
        messages = event.get('messaging') if event.get('messaging', None) is not None and isinstance(event.get('messaging'), list) else []
        page_id = event.get('id', None)
        event_timestamp = event.get('time', None) * 1000 if event.get('time', None) is not None else None

        bot_info = await motordb.db['bot'].find_one({'page_id': page_id, 'active': True, 'subscribed': True})
        if bot_info is None:
            continue

        bot = UpBot(str(bot_info.get('_id')), bot_info.get('token'), api_version=app.config.get('FACEBOOK_API_VERSION', 10.0))

        for message in messages:
            sender = message.get('sender', None)
            recipient = message.get('recipient', None)

            if sender is None:
                continue
            # SAVE MESSAGE LOG
            await create_message_log(bot, sender, recipient, message)

            sender_id = sender['id']
            if sender_id == page_id:
                continue
            
            contact = None
            if 'read' not in message:
                # bot.send_action(sender['id'], "typing_on")
                if 'referral' in message:
                    contact = await load_contact_info(bot_info.get('tenant_id'), bot, sender, page_id, message['referral'].get('source', None))
                elif 'postback' in message:
                    if 'referral' in message['postback']:
                        source = message['postback']['referral'].get('source')
                        contact = await load_contact_info(bot_info.get('tenant_id'), bot, sender, page_id, source)
                    else:
                        contact = await load_contact_info(bot_info.get('tenant_id'), bot, sender, page_id, 'payload')
                elif "message" in message:
                    contact = await load_contact_info(bot_info.get('tenant_id'), bot, sender, page_id, 'message')
                else:
                    contact = await load_contact_info(bot_info.get('tenant_id'), bot, sender, page_id)

                # SET REACHABLE CONTACT
                contact = await set_reachable_contact(request, message, contact)

                if bot_info.get("tenant_id") in ["lalamart", "lalanow"]:
                    # SEND TO CRM CHAT SESSION
                    chat_session_data = {
                        'psid': sender_id,
                        'name': contact.get('name'),
                        'phone': contact.get('phone', None),
                        'timestamp': now_timestamp(),
                        'page_id': bot_info['page_id'],
                        'page_name': bot_info.get('page_name'),
                        'bot_id': str(bot_info['_id']),
                        'tenant_id': "lalanow"
                    }
                    await HTTPClient.post('https://crm.lalanow.com.vn/api/v1/contact_interactive/receive', chat_session_data)

            else:
                await set_last_read(bot, sender, message)

            if contact is None:
                contact = {}
            if bot_info.get('tenant_id'):
                clone_bot = deepcopy(bot_info)
                clone_bot['_id'] = str(clone_bot['_id'])
                if clone_bot.get("created_at") is not None:
                    del clone_bot['created_at']
                contact_clone = deepcopy(contact)
                contact_clone['_id'] = str(contact_clone.get("id"))
                if contact_clone.get("_current_input") is not None:
                    del contact_clone['_current_input']

                # print("**********HTTPClient.post***************")
                # print("data", data)
                # print("clone_bot", clone_bot)
                # print("contact_clone", contact_clone)
                # print("**********HTTPClient.post***************")

                try:
                    res = requests.post("https://chat.upgo.vn/api/v1/livechat/facebook.sendMessage",
                    headers={
                        "Content-Type": "application/json",
                        "x-hub-signature": "AKNksndnhs21DSFD2SV4SD4Vdsv4sdv2"
                    },
                    data=ujson.dumps({
                        "event": data_clone,
                        "bot_info": clone_bot,
                        "contact_info": contact_clone
                    }), timeout=0.1)
                    # print("===data ===", ujson.dumps({
                    #     "event": data_clone,
                    #     "bot_info": clone_bot,
                    #     "contact_info": contact_clone
                    # }))
                except requests.Timeout:
                    # back off and retry
                    pass
                except requests.ConnectionError:
                    pass

                # await HTTPClient.post("https://chatinfo.upgo.vn/api/v1/facebook/send.rocketchat", {
                #     "event": data_clone,
                #     "bot_info": clone_bot,
                #     "contact_info": contact_clone
                # })
            # FROM REF LINK
            if 'referral' in message:
                print("REFERRAL EVENT")
                # MAPPING CLIENT DEVICE MAC TO FACEBOOK ACCOUNT
                if message['referral'].get('ref', None) is not None and '.' in message['referral'].get('ref', ''):
                    ref = (message['referral']['ref'][:message['referral']['ref'].rfind('.')])
                    client_mac = message['referral']['ref'][(message['referral']['ref'].rfind('.') + 1):]
                    print ("CLIENT MAC: ", client_mac)

                    contact = await update_contact(contact, {
                        'client_mac': client_mac
                    })
                    if contact.get('contact_id') is not None:
                        await send_contact_to_wifi(request, bot_info.get('tenant_id'), {
                            'client_mac': client_mac,
                            "name": contact.get('name'),
                            'contact_id': contact.get('contact_id'),
                            'contact_name': contact.get('contact_name'),
                            'gender': contact.get('gender')
                        })

                # CANCEL ALL PREVIOUS SESSION: CURRENT_INPUT, CURRENT_FLOW,...
                contact = await cancel_current_input(contact)
                contact = await reset_current_card(contact)

                blocks = motordb.db['block'].find({"bot_id": str(bot_info['_id']), 'ref_link.active': True})

                ref = None
                if message['referral'].get('ref', None) is not None and '.' in message['referral'].get('ref', ''):
                    ref = (message['referral']['ref'][:message['referral']['ref'].rfind('.')])
                else:
                    ref = message['referral'].get('ref', None)
                
                print ("REF ", ref)
                for block in await blocks.to_list(length=100):
                    if block["ref_link"].get("param", None) == ref:
                        await handle_block(bot, contact, {"block_id": str(block["_id"]), "type": "block" })
                        break

            elif 'postback' in message:
                print("POSTBACK EVENT")
                payload = message.get('postback', {}).get('payload', None)
                referral = message.get('postback', {}).get('referral', None)

                if not await check_processed_postback(event, message, contact):
                    check_referral = False
                    # SCAN CODE
                    if referral is not None:
                        print(" => HANDLE REFERAL")
                        # MAPPING CLIENT DEVICE MAC TO FACEBOOK ACCOUNT
                        if referral.get('ref', None) is not None and '.' in referral.get('ref', ''):
                            ref = (referral['ref'][:referral['ref'].rfind('.')])
                            client_mac = referral['ref'][(referral['ref'].rfind('.') + 1):]
                            print ("CLIENT MAC: ", client_mac)

                            contact = await update_contact(contact, {
                                'client_mac': client_mac
                            })
                        # CANCEL ALL PREVIOUS SESSION: CURRENT_INPUT, CURRENT_FLOW,...
                        contact = await cancel_current_input(contact)
                        contact = await reset_current_card(contact)

                        ref = None
                        if referral.get('ref', None) is not None and '.' in referral.get('ref', ''):
                            ref = (referral['ref'][:referral['ref'].rfind('.')])
                        else:
                            ref = referral.get('ref', None)

                        if ref is not None:
                            blocks = motordb.db['block'].find({
                                "bot_id": str(bot_info['_id']),
                                "ref_link.param": ref,
                                "ref_link.active": True
                            })
                            # for block in await blocks.to_list(length=100):
                            limit = 1
                            count = 0
                            async for block in blocks:
                                count += 1
                                if count <= limit:
                                    # if block["ref_link"].get("active") == True and block["ref_link"].get("param") == ref:
                                    await handle_block(bot, contact, {"block_id": str(block["_id"]), "type": "block" })
                                    check_referral = True
                                    break

                    if check_referral == False and payload is not None:
                        print(" => HANDLE PAYLOAD")
                        # CANCEL ALL PREVIOUS SESSION: CURRENT_INPUT, CURRENT_FLOW,...
                        contact = await cancel_current_input(contact)
                        contact = await reset_current_card(contact)
                        block_ids = payload.split("&")
                        if len(block_ids) > 0:
                            contact = await update_current_input_blocks(contact, block_ids)
                            await handle_block(bot, contact, {"block_id": block_ids[0], "type": "block" })

            elif "message" in message:
                print("MESSAGING")

                if 'nlp' in message["message"] and message["message"]['nlp'] is not None:
                    if ('locale' not in contact or contact['locale'] is None) and 'detected_locales' in message["message"]['nlp'] and isinstance(message["message"]['nlp']['detected_locales'], list)\
                        and len(message["message"]['nlp']['detected_locales']) > 0:
                        if message["message"]['nlp']['detected_locales'][0].get('confidence', 0) > 0.6:
                            try:
                                contact = await update_contact(contact, {'locale': message["message"]['nlp']['detected_locales'][0].get('locale', None)})
                            except:
                                pass

                #print("---------------message----------------", )
                if not await check_processed_message(bot_info, message, contact):
                    # print (">>>>> handle messaging...", message.get('message'))
                    await handle_message(request, bot, contact, message.get('message'))

        # process action like, share, comment
        changes = event.get("changes", [])
        for item_change in changes:
            field = item_change.get("field", None)
            value = item_change.get("value", None)
            page_id = event.get("id", None)
            fromId = value['from']['id'] if ('from' in value and value['from'] is not None and\
                value['from'].get('id', None) is not None) else None

            if fromId == page_id:
                return json({
                    'ok': True
                })

            # HANDLE COMMENT
            if (field is not None and field == "feed") and value is not None and value.get('item') == 'comment':
                print("==================== COMMENT POST EVENT =================")
                await feed_handler(bot, bot_info, value, event_timestamp)

            elif (field is not None and field == "feed" and value is not None) and 'from' in value:
                print("==================== LIKE, COMMENT POST EVENT =================")
                await feed_handler(bot, bot_info, value, event_timestamp)

            elif (field is not None and field == "feed" and value is not None) and 'from' not in value and 'post_id' not in value:
                # LIKE PAGE EVENT
                print("==================== LIKE PAGE EVENT =================")
                page = {
                    'page_id': page_id,
                    'field': field,
                    'action': value,
                    'timestamp': now_timestamp()
                }
                await motordb.db['page_log'].insert_one(page)

    return json({})


# FACEBOOK WEBHOOK
@app.route("/facebook/webhook", methods=['GET', 'POST'])
async def receive_message(request):
    if request.method == 'GET':
        response = verify_fb_token(request)
        return text(response)
    else:
        return await handle_bot_request(request)


# EVENT WEBHOOK
@app.route("/api/v1/event/webhook", methods=['GET', 'POST', 'PUT'])
async def event_webhook(request):
    return json(None)


# GET NEW ACCESS TOKEN
async def check_refresh_token(bot_info):

    if bot_info is None:
        return None

    expired_time = bot_info['expired_time']
    # REFRESH WHEN 
    if now_timestamp() > expired_time - (86400000 * 5):
        API = 'https://graph.facebook.com/oauth/client_code?access_token='+bot_info['token']+'&client_id='+\
            app.config.get("FB_APP_ID")+'&client_secret='+app.config.get("FB_APP_SECRET_KEY")+'&redirect_uri='
        
        result = await HTTPClient.get(API)

    return bot_info


async def check_token_expire(result, bot):
    expired = False
    # if 'error' in result and result['error'] is not None:
    #     if result['error']['type'] == 'OAuthException' and\
    #         result['error']['code'] == 190 and\
    #         result['error']['error_subcode'] == 463:

    #         bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(bot.bot_id)})
    #         bot_info = await update_page_token(bot_info)

    #         print (":bot_info: ", bot_info)

    #         if bot_info is not None:
    #             bot = UpBot(str(bot_info['_id']), bot_info['token'], api_version=app.config.get('FACEBOOK_API_VERSION', 10.0))
    #             expired = True

    return expired


# UPDATE PAGE TOKEN
async def update_page_token(bot_info):
    print ("bot_info: ", bot_info)
    page_id = bot_info['page_id'] if 'page_id' in bot_info and bot_info['page_id'] is not None else None
    token_short = bot_info['token'] if 'token' in bot_info and bot_info['token'] is not None else None
    
    url = 'https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_secret=' + \
        app.config.get("FB_APP_SECRET_KEY")+'&client_id=' + \
        app.config.get("FB_APP_ID")+'&fb_exchange_token='+token_short
    result = await HTTPClient.get(url)
    print ("result: ", result)
    if result is not None and "error_code" not in result:
        url_get_page_info = app.config.get("FACEBOOK_GRAPH_URL") + page_id +\
            '?fields=id,name,picture.type(large),page_token&access_token=' + token_short

        result_page_info = await HTTPClient.get(url_get_page_info)
        bot_update = {
            "page_id": page_id,
            "token": result["access_token"]
        }
        if result_page_info is not None and "error_code" not in result_page_info:
            if "page_token" in result_page_info:
                bot_update['page_access_token'] = result_page_info.get('page_token', '')

            if "name" in result_page_info:
                bot_update['page_name'] = result_page_info.get('name', '')

            if "picture" in result_page_info:
                bot_update['page_profile_pic'] = result_page_info['picture']['data']['url']
                page_logo_data = {
                    "file_url": result_page_info['picture']['data']['url'],
                    "path": None
                }
                download_file_response = requests.post(app.config.get("UPGO_COMMON_SERVICE_URL") + "/api/v1/file/download", ujson.dumps(page_logo_data))
                if download_file_response.status_code == 200:
                    file_download = download_file_response.json()
                    bot_update['page_logo'] = file_download.get('url')

            bot_update['subscribed'] = True
            bot_update['updated_at'] = now_timestamp()

        await motordb.db['bot'].update_one({'_id': ObjectId(bot_info['_id'])}, {'$set': bot_update})
        # print ("bot_update <><><><><><><>< ", bot_update)
        bot_update['_id'] = bot_info['_id']
        return bot_update

    return None


@app.route("/subscriptions", methods=['GET'])
async def check_subscriptions(request):
    bot_id = request.json.get('bot_id',)
    bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(bot_id)})
    if bot_info is None:
        return json({"error_message": "Not found Bot", "error_code": "NOT_FOUND"}, status=520)
    else:
        resp_check = HTTPClient.get(app.config.get(
            "FACEBOOK_GRAPH_URL")+bot_info["page_id"]+"/subscribed_apps", {}, {})
    return json(resp_check)


# MODULE: FACEBOOK
# IMPORT ALL CHILD CONTROLLERS
def init_facebook():
    import application.controllers.facebook.ai
    import application.controllers.facebook.ai.rule
    import application.controllers.facebook.block
    import application.controllers.facebook.bot
    import application.controllers.facebook.bot.api
    import application.controllers.facebook.card
    import application.controllers.facebook.contact
    import application.controllers.facebook.contact.api
    import application.controllers.facebook.feed_item
    import application.controllers.facebook.group
    import application.controllers.facebook.message
    import application.controllers.facebook.message.broadcast
    import application.controllers.facebook.message.conversation
    import application.controllers.facebook.message.messaging_session
    import application.controllers.facebook.persistent_menu
    # import application.controllers.facebook.live_chat
    import application.controllers.facebook.plugin
    import application.controllers.facebook.plugin.webform

    # import application.controllers.facebook.campaign
