import asyncio
import requests
import datetime
import time
import json as json_load
from copy import deepcopy
from application.database import motordb
from bson.objectid import ObjectId
from application.extensions import apimanager
from application.bot import UpBot
from gatco.response import json, text, html
from application.extensions import auth
from gatco_restapi.helpers import to_dict
from application.client import HTTPClient
from application.server import app
from application.controllers.base import auth_func
from application.common.helpers import merge_objects, now_timestamp, validate_phone, phone_regex,\
    handle_argument
from application.controllers.tenant import set_tenant
from application.controllers.facebook.contact import load_contact_info, update_contact
from application.witai.chatbot_api import wit_ai_handle, witai_pick_intents


# FEED ITEM HANDLER
# HANDLE BUSINESS OF FEED ACTIVITIES
async def feed_handler(bot, bot_info, value, event_time):

    page_id = bot_info.get('page_id')
    sender = value.get("from", None)
    post_id = value['post_id'] if 'post_id' in value else None
    comment_id = value['comment_id'] if 'comment_id' in value else None

    if bot_info is None or sender is None or page_id == sender.get('id'):
        return

    hadExist = False
    # CHECK DUPLICATED EVENT
    current_post = await motordb.db['facebook_post_log'].find_one({'post_id': post_id})
    if current_post is not None:
        comments = current_post['comments']
        if comments is not None and isinstance(comments, list):
            for cmt in comments:
                if cmt['comment_id'] == comment_id:
                    hadExist = True
    if hadExist == True:
        return

    # ACTIVITY LOG ON POST
    current_post = await motordb.db['facebook_post_log'].find_one({'post_id': post_id})
    method = None
    if current_post is None:
        method = "insert"
        current_post = {
            'bot_id': str(bot_info['_id']),
            'page_id': page_id,
            'post_id': value['post_id'],
            'comments': [],
            'replies': [],
            'messages': [],
            'hiddens': []
        }
        if 'post' in value and value['post'] is not None:
            current_post['post'] = value['post']

    else:
        method = "update"

    if value.get("item", None) == "comment":
        current_post['comments'].append({
            'comment_id': comment_id,
            'parent_id': value.get('parent_id', None),
            'message': value.get('message', None),
            'from': value.get('from', None),
            'verb': value.get('verb', None),
            'created_time': value.get('created_time', None)
        })

    if method == "update":
        result = await motordb.db['facebook_post_log'].update_one({'_id': ObjectId(current_post['_id'])}, {'$set': current_post})
    elif method == "insert":
        result = await motordb.db['facebook_post_log'].insert_one(current_post)

    contact = None
    if value['item'] == "comment":
        contact = await load_contact_info(bot_info.get('tenant_id'), bot, sender, page_id, value['item'])

    elif value['item'] == "reaction":
        contact = await load_contact_info(bot_info.get('tenant_id'), bot, sender, page_id, value['reaction_type'])
        return

    if contact is None:
        return

    feed_item = await motordb.db['feed_item'].find_one({'bot_id': str(bot_info.get('_id')), 'feed_item': value['item'], 'active': True})

    # print ("<><>>>>>>. feed_item ", feed_item)

    if feed_item is not None and isinstance(feed_item.get('rules'), list) and len(feed_item['rules']) > 0:
        tasks = []
        count = 0
        for rule in feed_item['rules']:
            pass_condition = False
            if rule['scope'] == 'any':
                pass_condition = validate_comment_rule(rule, value, current_post)
            elif 'post_id' in rule and value['post_id'] == rule['post_id']:
                pass_condition = validate_comment_rule(rule, value, current_post)

            # print (">>>>>>>>>>>pass_condition<<<<<<<<< ", pass_condition)
            if pass_condition == True:
                count += 1
                await handle_comment_action(bot_info, contact, value, rule, current_post, count)
                # tasks.append(handle_comment_action(bot_info, contact, value, rule, current_post, count))
                time.sleep(2)

        # await asyncio.gather(*(tasks))

####
#
####
def validate_comment_rule(rule, value, current_post):
    if rule is None:
        return True

    flag = False
    # unlimit
    comment_level = -1
    if rule.get('comment_level', None) is not None:
        try:
            comment_level = int(rule['comment_level'])
        except:
            pass

    if comment_level == 1:
        flag = False
        if value['post_id'] == value['parent_id']:
            flag = True
    else:
        flag = True

    # REPLY COMMENT HANDLER
    if flag == True and 'action_type' in rule and rule['action_type'] is not None and rule['action_type'] == 'reply_comment':
        flag = False

        # reply unlimit times
        reply_limit = -1
        if rule.get('reply_limit', None) is not None:
            reply_limit = int(rule['reply_limit'])

        if reply_limit >= 0:
            hadRepliedComments = []
            if current_post.get('replies', None) is not None and isinstance(current_post['replies'], list):
                hadRepliedComments = current_post['replies']

            flag = False
            for cmt in hadRepliedComments:
                if cmt.get('to', None) is not None and cmt['to'].get('id', None) == value['from']['id']:
                    reply_limit = reply_limit - 1

            if reply_limit > 0:
                flag = True
        else:
            flag = True

        return flag

    # SEND PRIVATE MESSAGE HANDLER
    elif flag == True and 'action_type' in rule and rule['action_type'] == 'send_private_message':
        flag = False
        # unlimit send privated message 
        reply_limit = -1
        if rule.get('reply_limit', None) is not None:
            reply_limit = int(rule['reply_limit'])

        if reply_limit >= 0:
            hadRepliedMessages = []
            if current_post.get('messages', None) is not None and isinstance(current_post['messages'], list):
                hadRepliedMessages = current_post['messages']

            flag = False
            for msg in hadRepliedMessages:
                if msg['to'] is not None and msg['to']['id'] == value['from']['id']:
                    reply_limit = reply_limit - 1

            if reply_limit > 0:
                flag = True
        else:
            flag = True

        return flag

    # HIDE COMMENT HANDLER
    elif flag == True and 'action_type' in rule and rule['action_type'] == 'hide_comment':
        if value['message'] is not None and 'verb' in value and value['verb'] == "add":
            flag = True

        return flag

    else:
        return False


async def handle_comment_action(bot_info, contact, value, comment_rule, current_post, count):
    rules = comment_rule['rules']
    post_id = value.get('post_id', None)
    comment_id = value.get('comment_id') if 'comment_id' in value else None
    if rules is None or not isinstance(rules, list) or len(rules) <= 0 or comment_id is None:
        return False

    selected_reply = None
    manual_setup_reply = None
    default_reply = None
    message = value.get('message', None)

    wit_response = await wit_ai_handle(bot_info, contact, message)

    picked_intents = await witai_pick_intents(wit_response)
    # {'id': '884909322029480', 'name': 'ask_menu', 'confidence': 0.9917}

    # DETECT TO REPLY
    for rule in rules:
        if 'default' in rule and rule['default'] == True:
            default_reply = rule['reply']

        # FIND AI DETECTION REPLY
        if picked_intents is not None:
            intents_value = picked_intents.get('name')
        
            if rule.get('intents', None) == intents_value:
                selected_reply = rule['reply']

        if selected_reply is None and 'text' in rule and isinstance(rule['text'], list) and len(rule['text']) > 0:
            for text in rule['text']:
                if text is not None and text.lower() == message.lower():
                    selected_reply = rule['reply']
                    break

    if selected_reply is None and default_reply is None:
        return False

    reply_url = app.config.get("FACEBOOK_GRAPH_URL")
    reply_data = None

    reply_message = selected_reply['message'] if (selected_reply is not None and selected_reply['message'] is not None and
                                                  selected_reply['message'].strip() != '') else default_reply['message']

    if reply_message is None or reply_message == "":
        return False

    reply_message = handle_argument(reply_message, contact)

    if comment_rule['action_type'] == "reply_comment":
        if value['post_id'] != value['parent_id']:
            comment_id = value['parent_id']
        reply_url += comment_id + "/comments"
        reply_data = {
            "message": reply_message,
            "access_token": bot_info['token']
        }

    elif comment_rule['action_type'] == "send_private_message":
        reply_data = {
            "recipient": {
                "comment_id": comment_id
            },
            "message": {
                "attachment":{
                    "type":"template",
                    "payload": {
                        "template_type":"button",
                        "text": reply_message,
                        "buttons": [
                            {
                                "type": "postback",
                                "title": "Xem thêm",
                                "payload": "welcome"
                            }
                        ]
                    }
                }
            }
        }
        reply_url += bot_info.get('page_id') + "/messages?access_token=" + bot_info['token']
        # reply_data = {
        #     "message": reply_message,
        #     "access_token": bot_info['token']
        # }

    elif comment_rule['action_type'] == "hide_comment":
        reply_url += comment_id
        reply_data = {
            "is_hidden": True,
            "access_token": bot_info['token']
        }
    else:
        return False

    if reply_url is not None and reply_data is not None:
        headers = {
            "Content-Type": "application/json"
        }
        # result_send_replies = HTTPClient.sync_post(reply_url, reply_data, headers=headers)
        # result_send_replies = await HTTPClient.post(reply_url, reply_data, headers=headers)

        response = requests.post(reply_url, data=json_load.dumps(reply_data), headers=headers)
        result_send_replies = response.json()
        # print("======================= result_send_replies =====================")
        # print (result_send_replies)
        if result_send_replies.get('error_code', None) is None:
            if current_post is not None:
                if comment_rule['action_type'] == "reply_comment":
                    current_post['replies'].append({
                        'verd': 'reply_comment',
                        'rule_id': comment_rule['_id'],
                        'comment_id': comment_id,
                        'message': reply_message,
                        'to': value['from'],
                        'time': now_timestamp()
                    })
                    await motordb.db['facebook_post_log'].update_one({'_id': ObjectId(current_post['_id'])}, {'$set': current_post})

                elif comment_rule['action_type'] == "send_private_message":
                    current_post['messages'].append({
                        'verd': 'send_private_message',
                        'rule_id': comment_rule['_id'],
                        'comment_id': comment_id,
                        'message': reply_message,
                        'to': value['from'],
                        'time': now_timestamp()
                    })
                    await motordb.db['facebook_post_log'].update_one({'_id': ObjectId(current_post['_id'])}, {'$set': current_post})

                elif comment_rule['action_type'] == "hide_comment" and selected_reply is not None:
                    current_post['hiddens'].append({
                        'verd': 'hide_comment',
                        'rule_id': comment_rule['_id'],
                        'comment_id': comment_id,
                        'to': value['from'],
                        'time': now_timestamp()
                    })
                    await motordb.db['facebook_post_log'].update_one({'_id': ObjectId(current_post['_id'])}, {'$set': current_post})

            return True
        return False
    return False



@app.route("/api/v1/facebook/feed_item/comment", methods=["GET", "POST", "OPTIONS"])
async def get_feed_comment(request):
    if request.method == "OPTIONS":
        return text("OK")

    if request.method == "GET":
        bot_id = request.args.get("bot_id", None)

        comment = await motordb.db['feed_item'].find_one({'feed_item': 'comment'})

        return json(to_dict(comment))

    return json(None)


@app.route("/api/v1/facebook/feed_item/save/attrs", methods=["PUT", "OPTIONS"])
async def update_properties(request):
    if request.method == "OPTIONS":
        return json(None)
    # try:
    data = request.json

    if data is None or '_id' not in data or data['_id'] is None:
        return json({"error_code": "DATA_ERROR", "error_message": "DATA_ERROR"}, status=520)

    feed_item = await motordb.db['feed_item'].find_one({'_id': ObjectId(data['_id'])})
    if feed_item is not None:
        save_feed_item = merge_objects(data, feed_item, False)
        result = await motordb.db['block'].update_one({"_id": ObjectId(feed_item.get("_id"))}, {'$set': save_feed_item})
        if result:
            return json({"message": "success"})
        return json({"message": "error"}, status=520)
    # except:
    #     return json({"error_code": "EXCEPTION", "error_message": "EXCEPTION"}, status=520)


async def pre_put_feed_item(data = None, **kw):

    # GET IMAGE INFO API
    # {{PHOTO_ID}}?fields=id,link,page_story_id&access_token=

    # detach post id from link
    if data is not None and isinstance(data['rules'], list):
        for idx, rule in enumerate(data['rules']):
            if rule.get('scope', None) is not None and rule['scope'] == 'one':
                bot_id = data.get('bot_id', None)
                bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(bot_id)})
                page_id = bot_info.get('page_id', None)
                if page_id is not None:
                    post_id = None
                    if rule['post_link'].find('?'):
                        main_link = ''
                        if rule['post_link'].find('/?') > 0:
                            main_link = rule['post_link'][:rule['post_link'].find('/?')]
                        else:
                            main_link = rule['post_link'][:rule['post_link'].find('?')]

                        splited_link = main_link.split('/')
                        post_id = splited_link[len(splited_link) - 1]
                    else:
                        main_link = ''
                        if rule['post_link'].find('/?') > 0:
                            main_link = rule['post_link'][:rule['post_link'].find('/?')]
                        else:
                            main_link = rule['post_link'][:rule['post_link'].find('?')]

                        splited_link = main_link.split('/')
                        post_id = splited_link[len(splited_link) - 1]

                    # PHOTO LINK
                    if rule['post_link'].find('type=3') >= 0:
                        photo_id = post_id
                        PHOTO_INFO_API = app.config.get('FACEBOOK_GRAPH_URL', 'v10.0') + photo_id +\
                            '?fields=id,link,page_story_id&access_token=' + bot_info['token']
                        
                        photo_info = await HTTPClient.get(PHOTO_INFO_API)
                        if photo_info is not None and 'page_story_id' in photo_info:
                            data['rules'][idx]['post_id'] = photo_info['page_story_id']
                        else:
                            return json({
                                'ok': False,
                                'error_code': 'ERROR',
                                'error_message': 'INVALID_POST_LINK'
                            }, status=520)
                    # POST LINK
                    else:
                        try:
                            a = float(post_id)
                            data['rules'][idx]['post_id'] = str(page_id) + '_' + str(post_id)
                        except:
                            return json({
                                'ok': False,
                                'error_code': 'ERROR',
                                'error_message': 'INVALID_POST_LINK'
                            }, status=520)

                else:
                    return json({
                        'ok': False,
                        'error_code': 'ERROR',
                        'error_message': 'INVALID_PAGE_INFO'
                    }, status=520)

            else:
                data['rules'][idx]['post_id'] = None




apimanager.create_api(collection_name='feed_item',
                      methods=['GET', 'POST', 'DELETE', 'PUT'],
                      url_prefix='/api/v1/facebook',
                      preprocess=dict(
                          GET_SINGLE=[auth_func],
                          GET_MANY=[auth_func],
                          POST=[auth_func, set_tenant],
                          PUT_SINGLE=[auth_func, pre_put_feed_item]
                      ),
                      postprocess=dict(POST=[])
                      )
