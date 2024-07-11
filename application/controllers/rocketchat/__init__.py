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

from application.common.helpers import handle_argument, merge_objects

from application.common.helpers import convert_phone_number, now_timestamp
from application.common.file_helper import download_file


def check_text_rule(incomemessage, rule_texts):
    match = True
    checkmsg = incomemessage.lower().strip()
    for txt in rule_texts:
        if match and (txt in checkmsg):
            continue
        else:
            match = False
            break

    return match


async def handle_current_contact_input(request, bot, contact, incomemessage):
    return True


async def check_processed_message(bot_info, message, contact):
    return False

async def load_contact_info(tenant_id, bot, sender, page_id, source=None):
    now = now_timestamp()
    # contact = await motordb.db['contact'].find_one({'bot_id': bot.bot_id, 'id': sender['id']})
    # info = bot.get_user_info(sender['id'])
    # print("=======SENDER INFO ========", sender)
    # print("=======USER INFO FROM FACEBOOK========", info)
    # if contact is None and sender is not None:
    #     if info is None:
    #         info = {}
    #         if sender is not None and sender.get('id', None) is not None and sender.get('name', None) is not None:
    #             info = {
    #                 "id": sender['id'],
    #                 "name": sender.get('name', None),
    #                 "client_mac": sender.get('client_mac', None)
    #             }

    #     if info is not None and info.get("name") is None:
    #         if (info.get("first_name", None) is not None) or (info.get("last_name", None) is not None):
    #             info["name"] = info.get(
    #                 "first_name", "") + " " + info.get("last_name", "")
    #             info["name"] = info["name"].strip()
    #             if info.get('profile_pic', None) is not None and info['profile_pic'] != '':
    #                 info['profile_pic'] = info.get('profile_pic', '')

    #     info['id'] = sender['id']
    #     info['page_id'] = page_id
    #     info['bot_id'] = bot.bot_id
    #     info['contact_type'] = 'facebook_psid'
    #     info['source'] = source if source is not None else None
    #     info['client_mac'] = sender.get('client_mac', None)
    #     info['last_action'] = {}
    #     info['last_sent'] = now
    #     info['last_seen'] = now
    #     info['interacted'] = False
    #     info['reachable'] = False
    #     info['created_at'] = now
    #     info['updated_at'] = now
    #     info["_current_input"] = {}
    #     result = await motordb.db['contact'].insert_one(info)

    #     contact = info
    #     contact['_id'] = result.inserted_id

    #     # headers = {
    #     #     "Content-Type": "application/json",
    #     # }
    #     # persistent_menu_data = {
    #     #     'tenant_id': tenant_id,
    #     #     'bot_id': str(bot.bot_id),
    #     #     'psid': sender['id']
    #     # }
    #     # requests.post(app.config.get('HOST_URL') + '/api/v1/persistent_menu/custom_user_settings',\
    #     #     data=ujson.dumps(persistent_menu_data), headers=headers)

    # else:
    #     if info is not None:
    #         if 'id' in info:
    #             del info['id']
    #         if '_id' in info:
    #             del info['_id']

    #         for key in sender:
    #             info[key] = sender[key]
    #         updated_contact = merge_objects(info, contact, False)
    #         if sender.get('client_mac', None) is not None and sender.get('client_mac', "") != "":
    #             updated_contact['client_mac'] = sender.get('client_mac', None)

    #         await motordb.db['contact'].update_one({'_id': ObjectId(contact['_id'])}, {'$set': updated_contact})
    #         contact = updated_contact

    # if "_current_input" not in contact:
    #     contact["_current_input"] = {}

    # return deepcopy(contact)
    return {}

def verify_rocket_token(request):
#     hub_mode = request.args.get("hub.mode")
#     hub_verify_token = request.args.get("hub.verify_token")
#     hub_challenge = request.args.get("hub.challenge")
#     if hub_verify_token == FB_HUB_VERIFY_TOKEN:
#         return hub_challenge
    
    return True

    # return text("Invalid verification token")


# HANDLE NORMAL MESSAGE
async def handle_message(request, bot, contact, message):
    # CHECK MESSAGE
    income_message = message.get('text', None)
    # HANDLE USER-INPUT FORM
    if income_message is not None:
        be_continue = await handle_current_contact_input(request, bot, contact, income_message)
        print("be_continue ... ", be_continue)
        if be_continue is True:
            # HANDLE SETUP AI
            return await handle_ai_rule(request, bot, contact, income_message)


async def handle_ai_rule(request, bot, contact, income_message):
    ai_rules = motordb.db['rule'].find({'bot_id': bot.bot_id})
    bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(bot.bot_id)})

    # wit_response = await wit_ai_handle(bot_info, contact, income_message)
    # # print (">>>>>>>>>> handle_ai_rule".upper(), wit_response)
    # wit_selected_rule = await witai_check(bot_info, wit_response, income_message)
    
    wit_selected_rule = None
    print ("wit_selected_rule ", wit_selected_rule, ai_rules)

    if (wit_selected_rule != None):
        # sourceData = merge_objects({
        #     'page_id': bot_info.get('page_id', ''),
        #     'page_name': bot_info.get('page_name', ''),
        # }, contact)
        # if wit_selected_rule.get('suggested', None) is not None:
        #     suggested_message = handle_argument(wit_selected_rule.get('suggested', ''), sourceData)
        #     await handle_ai_cases(bot, contact, {'type': 'text'}, suggested_message)

        # send_message = handle_argument(wit_selected_rule.get('reply_text', ''), sourceData)

        # await handle_ai_cases(bot, contact, wit_selected_rule, send_message)
        pass

    else:
        found_answer = False
        async for rule in ai_rules:
            print(income_message, rule['text'])
            if check_text_rule(income_message, rule['text']) == True:
                found_answer = True
                if rule is not None and ('random' in rule) and ('action' in rule):
                    # version 2 AI with multiple answer
                    pass
                else:
                    sourceData = merge_objects({
                        'page_id': bot_info.get('page_id', ''),
                        'page_name': bot_info.get('page_name', ''),
                    }, contact)
                    send_message = handle_argument(rule['reply_text'], sourceData)

                    if rule['type'] == 'text':
                        return send_message
                    else:
                        print("Rule type not support in rocketchat")

                    # await handle_ai_cases(bot, contact, rule, send_message)
                break
        
        print (">>>>> found_answer ", found_answer)
        if found_answer == False:
            # FIND DEFAULT ANSWERS
            send_message = ''
            random_answers_count = await motordb.db['rule'].count_documents({'bot_id': bot.bot_id, 'default': True})
            if random_answers_count is not None and random_answers_count > 0:
                selected_idx = random.randint(0, random_answers_count - 1)
                random_answers = motordb.db['rule'].find({'bot_id': bot.bot_id, 'default': True})

                index = 0
                async for ans in random_answers:
                    if index == selected_idx:
                        sourceData = merge_objects({
                            'page_id': bot_info.get('page_id', ''),
                            'page_name': bot_info.get('page_name', '')
                        }, contact)
                        send_message = handle_argument(ans['reply_text'], sourceData)                        
                        break
                    index += 1
            return send_message

# async def handle_ai_cases(bot, contact, rule, will_send_message):
#     result_bot = {}
#     # print("will_send_message=====", will_send_message)
#     if rule['type'] == 'text':
#         result_bot = bot.send_text_message(contact['id'], will_send_message)
#         # contact = await set_last_sent_contact(contact)

#     elif (rule['type'] == 'block') and ('block' in rule) and (rule['block'] is not None):
#         await handle_block(bot, contact, {"block_id": rule['block']['_id'], "type": "block"})
#     elif (rule['type'] == 'block') and ('blocks' in rule) and (rule['blocks'] is not None):
#         block_ids = [block.get("_id") for block in rule['blocks']]
#         if len(block_ids) > 0:
#             contact = await update_current_input_blocks(contact, block_ids)
#             await handle_block(bot, contact, {"block_id": block_ids[0], "type": "block"})
#     # await send_to_chatinfo(bot, contact, rule, will_send_message, result_bot)


class RocketBot(object):
    previous_action = None
    data = {}
    def __init__(self, bot_id, access_token=None, **kw):
        # super(UpBot, self).__init__(access_token, **kw)
        self.bot_id = bot_id
        self.access_token = access_token


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
        # page_id = event.get('id', None)
        rocketbot_id = event.get('bot_id', None)

        event_timestamp = event.get('time', None) * 1000 if event.get('time', None) is not None else None

        bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(rocketbot_id), 'active': True})
        print("Rocket Bot", bot_info)
        if bot_info is None:
            continue

        bot = RocketBot(str(bot_info.get('_id')), None)

        for message in messages:
            sender = message.get('sender', None)
            recipient = message.get('recipient', None)

            if sender is None:
                continue
            # SAVE MESSAGE LOG
            # await create_message_log(bot, sender, recipient, message)

            sender_id = sender['id']
            # if sender_id == page_id:
            #     continue
            
            contact = None
            # if 'read' not in message:

            #     if 'referral' in message:
            #         contact = await load_contact_info(bot_info.get('tenant_id'), bot, sender, page_id, message['referral'].get('source', None))
            #     elif 'postback' in message:
            #         if 'referral' in message['postback']:
            #             source = message['postback']['referral'].get('source')
            #             contact = await load_contact_info(bot_info.get('tenant_id'), bot, sender, page_id, source)
            #         else:
            #             contact = await load_contact_info(bot_info.get('tenant_id'), bot, sender, page_id, 'payload')
            #     elif "message" in message:
            #         contact = await load_contact_info(bot_info.get('tenant_id'), bot, sender, page_id, 'message')
            #     else:
            #         contact = await load_contact_info(bot_info.get('tenant_id'), bot, sender, page_id)

            #     # SET REACHABLE CONTACT
            #     # contact = await set_reachable_contact(request, message, contact)

            # else:
            #     # await set_last_read(bot, sender, message)
            #     pass

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

               
            
            if 'postback' in message:
                print("POSTBACK EVENT")
                # payload = message.get('postback', {}).get('payload', None)
                # referral = message.get('postback', {}).get('referral', None)

                # if not await check_processed_postback(event, message, contact):
                #     check_referral = False
                #     # SCAN CODE
                #     if referral is not None:
                #         print(" => HANDLE REFERAL")
                #         # MAPPING CLIENT DEVICE MAC TO FACEBOOK ACCOUNT
                #         if referral.get('ref', None) is not None and '.' in referral.get('ref', ''):
                #             ref = (referral['ref'][:referral['ref'].rfind('.')])
                #             client_mac = referral['ref'][(referral['ref'].rfind('.') + 1):]
                #             print ("CLIENT MAC: ", client_mac)

                #             contact = await update_contact(contact, {
                #                 'client_mac': client_mac
                #             })
                #         # CANCEL ALL PREVIOUS SESSION: CURRENT_INPUT, CURRENT_FLOW,...
                #         contact = await cancel_current_input(contact)
                #         contact = await reset_current_card(contact)

                #         ref = None
                #         if referral.get('ref', None) is not None and '.' in referral.get('ref', ''):
                #             ref = (referral['ref'][:referral['ref'].rfind('.')])
                #         else:
                #             ref = referral.get('ref', None)

                #         if ref is not None:
                #             blocks = motordb.db['block'].find({
                #                 "bot_id": str(bot_info['_id']),
                #                 "ref_link.param": ref,
                #                 "ref_link.active": True
                #             })
                #             # for block in await blocks.to_list(length=100):
                #             limit = 1
                #             count = 0
                #             async for block in blocks:
                #                 count += 1
                #                 if count <= limit:
                #                     # if block["ref_link"].get("active") == True and block["ref_link"].get("param") == ref:
                #                     await handle_block(bot, contact, {"block_id": str(block["_id"]), "type": "block" })
                #                     check_referral = True
                #                     break

                #     if check_referral == False and payload is not None:
                #         print(" => HANDLE PAYLOAD")
                #         # CANCEL ALL PREVIOUS SESSION: CURRENT_INPUT, CURRENT_FLOW,...
                #         contact = await cancel_current_input(contact)
                #         contact = await reset_current_card(contact)
                #         block_ids = payload.split("&")
                #         if len(block_ids) > 0:
                #             contact = await update_current_input_blocks(contact, block_ids)
                #             await handle_block(bot, contact, {"block_id": block_ids[0], "type": "block" })

            elif "message" in message:
                print("MESSAGING")

                # if 'nlp' in message["message"] and message["message"]['nlp'] is not None:
                #     if ('locale' not in contact or contact['locale'] is None) and 'detected_locales' in message["message"]['nlp'] and isinstance(message["message"]['nlp']['detected_locales'], list)\
                #         and len(message["message"]['nlp']['detected_locales']) > 0:
                #         if message["message"]['nlp']['detected_locales'][0].get('confidence', 0) > 0.6:
                #             try:
                #                 contact = await update_contact(contact, {'locale': message["message"]['nlp']['detected_locales'][0].get('locale', None)})
                #             except:
                #                 pass

                #print("---------------message----------------", )
                if not await check_processed_message(bot_info, message, contact):
                    reponse_text = await handle_message(request, bot, contact, message.get('message'))
                    return json({
                        "message": reponse_text
                    })
    return json({})


# FACEBOOK WEBHOOK
@app.route("/rocket/webhook", methods=['GET', 'POST'])
async def receive_message(request):
    if request.method == 'GET':
        response = verify_rocket_token(request)
        return text(response)
    else:
        return await handle_bot_request(request)

