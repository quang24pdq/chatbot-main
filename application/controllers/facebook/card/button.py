from pymessenger import Bot, Button
from jinja2 import Template
from json_logic import jsonLogic
from bson.objectid import ObjectId
from application.jwt_utils import encode_jwt
from application.database import motordb
from application.auth import generate_redis_key
from application.common.helpers import convert_phone_number, generate_unique_key


async def handle_buttons(buttons, card=None, block_id=None, contact=None):
    if buttons is not None:
        
        payload_message = []
        for button in buttons:
            # handle each type btn
            # should use switch case
            btn = None
            if button.get("type") == "web_url" and (button.get('url', None) is not None):
                webview_height_ratio = button['webview_height_ratio'] if button.get('webview_height_ratio', None) is not None else 'tall'
                webview_url = button.get('url', None)

                bot_info = await motordb.db['bot'].find_one({"_id": ObjectId(contact.get('bot_id'))})
                
                jwt_token = encode_jwt({
                    'tid': str(bot_info.get('tenant_id')),
                    'session_key': generate_redis_key(str(contact.get('id')), {
                        'tid': str(bot_info.get('tenant_id')),
                        'contact_phone': str(contact.get('phone')),
                        'page_scoped_id': str(contact.get('id')),
                        'page_id': str(bot_info.get('page_id')),
                        'bot_id': str(contact.get('bot_id'))
                    })
                })

                if webview_url is not None and (webview_url.startswith("https://me.upgo.vn") or webview_url.startswith("https://me.anygo.vn")):
                    if '?' in webview_url:
                        webview_url = webview_url + '&access_token=' + jwt_token
                    else:
                        webview_url = webview_url + '?access_token=' + jwt_token
                    webview_url = webview_url + '&fbid=' + str(contact.get('bot_id')) + '&fpsid=' + str(contact.get('id'))

                elif webview_url is not None and webview_url.startswith("https://upstart.vn"):
                    if '?' in webview_url:
                        webview_url = webview_url + '&bot_id=' + str(contact.get('bot_id')) + '&page_id=' + str(bot_info.get('page_id')) + '&page_scope_id=' + str(contact.get('id'))
                    else:
                        webview_url = webview_url + '?bot_id=' + str(contact.get('bot_id')) + '&page_id=' + str(bot_info.get('page_id')) + '&page_scope_id=' + str(contact.get('id'))

                elif webview_url is not None and webview_url.startswith("https://bot.upgo.vn"):
                    if '?' in webview_url:
                        webview_url = webview_url + '&bot_id=' + str(contact.get('bot_id')) + '&page_id=' + str(bot_info.get('page_id')) + '&page_scope_id=' + str(contact.get('id'))
                    else:
                        webview_url = webview_url + '?bot_id=' + str(contact.get('bot_id')) + '&page_id=' + str(bot_info.get('page_id')) + '&page_scope_id=' + str(contact.get('id'))
                
                elif webview_url is not None and webview_url.startswith("https://crm.upgo.vn"):
                    if webview_url.find("api/v2/contact/card") > 0:
                        if webview_url.endswith("/") == True:
                            webview_url = webview_url + str(bot_info.get('tenant_id')) + "/" + contact.get('contact_id', None)
                        else:
                            if contact.get('contact_id', None) is not None:
                                webview_url = webview_url + "/" + str(bot_info.get('tenant_id')) + "/" + contact.get('contact_id', None)
                            else:
                                webview_url = webview_url + "/" + str(bot_info.get('tenant_id')) + "/0"
                        
                        if '?' in webview_url:
                            webview_url = webview_url + "&phone=" + contact.get('phone')
                        else:
                            webview_url = webview_url + "?phone=" + contact.get('phone')

                    elif '?' in webview_url:
                        webview_url = webview_url + '&bot_id=' + str(contact.get('bot_id')) + '&page_id=' + str(bot_info.get('page_id')) + '&page_scope_id=' + str(contact.get('id'))
                    else:
                        webview_url = webview_url + '?bot_id=' + str(contact.get('bot_id')) + '&page_id=' + str(bot_info.get('page_id')) + '&page_scope_id=' + str(contact.get('id'))
                
                elif webview_url is not None and webview_url.startswith("https://site.upgo.vn"):
                    if '?' in webview_url:
                        webview_url = webview_url + '&bot_id=' + str(contact.get('bot_id')) + '&page_id=' + str(bot_info.get('page_id')) + '&page_scope_id=' + str(contact.get('id'))
                    else:
                        webview_url = webview_url + '?bot_id=' + str(contact.get('bot_id')) + '&page_id=' + str(bot_info.get('page_id')) + '&page_scope_id=' + str(contact.get('id'))
                else:
                    if webview_url is not None:
                        if '?' in webview_url:
                            webview_url = webview_url + '&bot_id=' + str(contact.get('bot_id')) + '&page_id=' + str(bot_info.get('page_id')) + '&page_scope_id=' + str(contact.get('id'))
                        else:
                            webview_url = webview_url + '?bot_id=' + str(contact.get('bot_id')) + '&page_id=' + str(bot_info.get('page_id')) + '&page_scope_id=' + str(contact.get('id'))

                btn = Button(title=button.get("title"), type="web_url", url=webview_url, webview_height_ratio=webview_height_ratio)
                payload_message.append(btn)

            if (button.get("type") == "postback" or button.get("type") == "blocks")\
                and isinstance(button.get('blocks', None), list) and len(button['blocks']) > 0:
                pl = ''
                for block in button['blocks']:
                    pl += block['_id']
                    pl += '&'
                pl = pl.rstrip('&')
                btn = Button(title=button.get("title"), type="postback", payload=pl)
                payload_message.append(btn)

            if button.get("type") == "phone_number" and button.get('phone_number', None) is not None:
                phone_number = convert_phone_number(button['phone_number'], output_type="+84")
                btn = Button(title=button.get("title"), type="phone_number", payload=phone_number)
                payload_message.append(btn)

    if payload_message != []:
        return payload_message
    else:
        return None


def get_button_payload_message(buttons):

    if buttons is not None:
        payload_message = []
        for button in buttons:
                # handle each type btn
                # should use switch case
            btn = None
            if (button['url'] is not None):
                btn = Button(title=button.get("title"), type="web_url",
                             url=button.get("url"), webview_height_ratio="full")
            elif (button['blocks'] != []):
                pl = ''
                for block in button['blocks']:
                    pl += block['_id']
                    pl += '&'
                pl = pl.rstrip('&')
                btn = Button(title=button.get("title"),
                             type="postback", payload=pl)
            elif (button['phone_number'] is not None):
                phone_number = convert_phone_number(
                    button['phone_number'], output_type="+84")
                btn = Button(title=button.get("title"),
                             type="phone_number", payload=phone_number)
            if btn is not None:
                payload_message.append(btn)

    if payload_message != []:
        return payload_message
    else:
        return None



def handle_messenger_buttons(bot_info, buttons, contact=None):
    
    if bot_info is None or buttons is None or isinstance(buttons, list) != True:
        return None

    messenger_buttons = []

    for button in buttons:
        btn = None
        if (button.get("type") == "postback" or button.get("type") == "blocks") and\
            isinstance(button.get('blocks', None), list) and len(button['blocks']) > 0:
            block = button['blocks'][0]
            payload = block.get('_id')
            if block.get('payload', None) is not None:
                payload = block.get('payload')

            btn = Button(title=button.get("title"), type="postback", payload=payload)
            messenger_buttons.append(btn)

        elif button.get("type") == "web_url" and (button.get('url', None) is not None):
            webview_height_ratio = button['webview_height_ratio'] if button.get('webview_height_ratio', None) is not None else 'tall'
            webview_url = button.get('url', None)

            if webview_url is not None and (webview_url.startswith("https://me.anygo.vn") or webview_url.startswith("https://me.upgo.vn")):
                if '?' in webview_url:
                    webview_url = webview_url + '&page_id=' + str(bot_info.get('page_id')) + '&page_scope_id=' + str(contact.get('id'))
                else:
                    webview_url = webview_url + '?page_id=' + str(bot_info.get('page_id')) + '&page_scope_id=' + str(contact.get('id'))
                webview_url = webview_url + '&contact_id=' + contact.get('phone', '')

            elif webview_url is not None and webview_url.startswith("https://upstart.vn"):
                if '?' in webview_url:
                    webview_url = webview_url + '&bot_id=' + str(contact.get('bot_id')) + '&page_id=' + str(bot_info.get('page_id')) + '&page_scope_id=' + str(contact.get('id'))
                else:
                    webview_url = webview_url + '?bot_id=' + str(contact.get('bot_id')) + '&page_id=' + str(bot_info.get('page_id')) + '&page_scope_id=' + str(contact.get('id'))

            elif webview_url is not None and webview_url.startswith("https://bot.upgo.vn"):
                if '?' in webview_url:
                    webview_url = webview_url + '&bot_id=' + str(contact.get('bot_id')) + '&page_id=' + str(bot_info.get('page_id')) + '&page_scope_id=' + str(contact.get('id'))
                else:
                    webview_url = webview_url + '?bot_id=' + str(contact.get('bot_id')) + '&page_id=' + str(bot_info.get('page_id')) + '&page_scope_id=' + str(contact.get('id'))

            elif webview_url is not None and webview_url.startswith("https://crm.upgo.vn"):
                if webview_url.find("api/v2/contact/card") > 0:
                    if webview_url.endswith("/") == True:
                        webview_url = webview_url + str(bot_info.get('tenant_id')) + "/" + contact.get('contact_id') if contact.get('contact_id') is not None else "0"
                    else:
                        webview_url = webview_url + "/" + str(bot_info.get('tenant_id')) + "/" + contact.get('contact_id') if contact.get('contact_id') is not None else "0"

                    if '?' in webview_url:
                        webview_url = webview_url + "&phone=" + contact.get('phone')
                    else:
                        webview_url = webview_url + "?phone=" + contact.get('phone')

                elif '?' in webview_url:
                    webview_url = webview_url + '&bot_id=' + str(contact.get('bot_id')) + '&page_id=' + str(bot_info.get('page_id')) + '&page_scope_id=' + str(contact.get('id'))
                else:
                    webview_url = webview_url + '?bot_id=' + str(contact.get('bot_id')) + '&page_id=' + str(bot_info.get('page_id')) + '&page_scope_id=' + str(contact.get('id'))

            else:
                if '?' in webview_url:
                    webview_url = webview_url + '&bot_id=' + str(contact.get('bot_id')) + '&page_id=' + str(bot_info.get('page_id')) + '&page_scope_id=' + str(contact.get('id'))
                else:
                    webview_url = webview_url + '?bot_id=' + str(contact.get('bot_id')) + '&page_id=' + str(bot_info.get('page_id')) + '&page_scope_id=' + str(contact.get('id'))

            btn = Button(title=button.get("title"), type="web_url", url=webview_url, webview_height_ratio=webview_height_ratio)
            messenger_buttons.append(btn)

        elif button.get("type") == "phone_number" and button.get('phone_number', None) is not None:
            phone_number = convert_phone_number(button['phone_number'], output_type="+84")
            btn = Button(title=button.get("title"), type="phone_number", payload=phone_number)
            messenger_buttons.append(btn)

    if len(messenger_buttons) > 0:
        return messenger_buttons

    return None
