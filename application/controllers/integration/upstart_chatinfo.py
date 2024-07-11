import requests
import json as ujson
from copy import deepcopy
from datetime import datetime
from gatco.response import json


UPGO_TOKEN_FOR_CHATINFO = 'WcGHQLj2r0SzgqU7uFV6HbP6fUbFD1EW'

class BaseHander:
    TOKEN_CHAT_INFO = UPGO_TOKEN_FOR_CHATINFO
    DOMAIN = "https://chat.upgo.vn"
    PRE_FIX = "/api/v1"
    def send_message(self):
        pass
    def generate_header(self, headers = None):
        if headers is None:
            headers = {
                "content-type": "application/json",
                "chat-info-token": self.TOKEN_CHAT_INFO
                }
        return headers
    def generate_url(self, pre_fix = None, url = None):
        if url is None:
            return None
        if pre_fix is None:
            pre_fix = self.PRE_FIX
        return self.DOMAIN + pre_fix + url

class ChatbotToContactHander(BaseHander):
    
    def send_message(self, message):
        print("message============", message)
        try:
            message['_id'] = str(message.get('_id'))
            message['id'] = str(message.get('id'))
            api = self.generate_url(url = "/facebook/send.rocketchat/CHATBOT_TO_CONTACT")
            headers = self.generate_header()
            requests.post(api, data=ujson.dumps(message), headers = headers, timeout=0.1)
        except requests.Timeout:
            # back off and retry
            pass
        except requests.ConnectionError:
            pass

class ContactToChatBotHander(BaseHander):
    
    def send_message(self, event, bot_info, contact_info):
        try:
            api = self.generate_url(url = "/facebook/send.rocketchat/CONTACT_TO_CHATBOT")
            headers = self.generate_header()
            requests.post(api, data=ujson.dumps({
                "event": event,
                "bot_info": bot_info,
                "contact_info": contact_info
            }), headers = headers, timeout=0.1)
        except requests.Timeout:
            # back off and retry
            pass
        except requests.ConnectionError:
            pass

class ChatInfoHandlerType:
    CONTACT_TO_CHATBOT = "CONTACT_TO_CHATBOT"
    CHATBOT_TO_CONTACT = "CHATBOT_TO_CONTACT"

class ChatInfoHandlerFactory:
    @classmethod
    def get_hander(cls, hander_type):
        if hander_type == ChatInfoHandlerType.CONTACT_TO_CHATBOT:
            return ContactToChatBotHander
        if hander_type == ChatInfoHandlerType.CHATBOT_TO_CONTACT:
            return ChatbotToContactHander
        return None