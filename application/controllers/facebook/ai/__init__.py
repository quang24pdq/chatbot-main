import requests
import json as ujson
import time, random
import uuid
from math import floor
from application.database import motordb
from bson.objectid import ObjectId
from application.common.helpers import merge_objects, now_timestamp
from application.controllers.facebook.block import handle_block
from application.controllers.facebook.contact.current_input import update_current_input_blocks
from application.common.helpers import handle_argument
from application.controllers.facebook.contact import set_last_sent_contact, update_contact
from application.controllers.facebook.message.messaging_session import update_session_detection
from application.witai.chatbot_api import wit_ai_handle, witai_check


def check_text_rule(income_message, rule_texts, options={}):
    if 'like' in options and options['like'] == True:
        for txt in rule_texts:
            comingmsg_split = income_message.split(' ')
            rule_text_split = txt.split(' ')
            match = 0
            for i in comingmsg_split:
                if i is not None and str(i).strip() != "":
                    flag = False
                    for j in rule_text_split:
                        if i.lower().strip() == j.lower().strip():
                            flag = True
                    if flag == True:
                        match += 1

            rate1 = match/len(comingmsg_split)
            rate2 = match/len(rule_text_split)
            if ((rate1 + rate2) / 2) > 0.6:
                return True
    else:
        for txt in rule_texts:
            if (txt is not None) and (income_message.lower().strip() == txt.lower().strip()):
                return True

    return False



async def handle_ai_rule(request, bot, contact, income_message):
    ai_rules = motordb.db['rule'].find({'bot_id': bot.bot_id})
    bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(bot.bot_id)})

    wit_response = await wit_ai_handle(bot_info, contact, income_message)
    wit_selected_rule = await witai_check(bot_info, wit_response, income_message)

    if (wit_selected_rule != None):
        sourceData = merge_objects({
            'page_id': bot_info.get('page_id', ''),
            'page_name': bot_info.get('page_name', ''),
        }, contact)
        if wit_selected_rule.get('suggested', None) is not None:
            suggested_message = handle_argument(wit_selected_rule.get('suggested', ''), sourceData)
            await handle_ai_cases(bot, contact, {'type': 'text'}, suggested_message)

        send_message = handle_argument(wit_selected_rule.get('reply_text', ''), sourceData)

        await handle_ai_cases(bot, contact, wit_selected_rule, send_message)

    else:
        found_answer = False
        async for rule in ai_rules:
            if check_text_rule(income_message, rule['text'], {'like': True}) == True:
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

                    await handle_ai_cases(bot, contact, rule, send_message)
                break

        if found_answer == False:
            # FIND DEFAULT ANSWERS
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
                        await handle_ai_cases(bot, contact, ans, send_message)
                        break
                    index += 1

async def handle_ai_cases(bot, contact, rule, will_send_message):
    result_bot = {}
    # print("will_send_message=====", will_send_message)
    if rule['type'] == 'text':
        result_bot = bot.send_text_message(contact['id'], will_send_message)
        contact = await set_last_sent_contact(contact)
    elif (rule['type'] == 'block') and ('block' in rule) and (rule['block'] is not None):
        await handle_block(bot, contact, {"block_id": rule['block']['_id'], "type": "block"})
    elif (rule['type'] == 'block') and ('blocks' in rule) and (rule['blocks'] is not None):
        block_ids = [block.get("_id") for block in rule['blocks']]
        if len(block_ids) > 0:
            contact = await update_current_input_blocks(contact, block_ids)
            await handle_block(bot, contact, {"block_id": block_ids[0], "type": "block"})
    # await send_to_chatinfo(bot, contact, rule, will_send_message, result_bot)


async def send_to_chatinfo(bot, contact, rule, will_send_message, result_bot):
    # print("bot=====", bot)
    # print("contact=====", contact)
    # print("rule=====", rule)
    # print("will_send_message=====", will_send_message)
    # print("result_bot=====", result_bot)
    try:
        requests.post("https://chatinfo.upgo.vn/api/v1/facebook/send.rocketchat/CHATBOT_TO_CONTACT", data=ujson.dumps({
            "contact": contact,
            "rule": rule,
            "will_send_message": will_send_message
        }), timeout=0.1)
    except requests.Timeout:
        # back off and retry
        pass
    except requests.ConnectionError:
        pass
