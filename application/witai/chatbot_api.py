import time
import uuid
from math import floor
from application.database import motordb
from bson.objectid import ObjectId
from application.common.helpers import merge_objects, now_timestamp, validate_phone, phone_regex
from application.controllers.facebook.contact import update_contact
from application.controllers.facebook.message.messaging_session import update_session_detection, get_session_detection
from wit import Wit
from application.common.constants import WIT_APPS

GENDER_MAP = {
    'male': 'Anh',
    'female': "Chị"
}

async def wit_ai_handle(bot_info, contact, income_message):
    wit_response = None

    wit_app = None
    if bot_info.get('business_line') is not None:
        for app in WIT_APPS:
            if app.get('business_line') == bot_info.get('business_line'):
                wit_app = app

    if wit_app is not None:
        try:
            wit_token = wit_app.get('access_token', None)
            client = Wit(access_token=wit_token)
            # wit_response = client.message(msg=income_message, context={'session_id': str(contact.get('id', str(uuid.uuid4())))})
            wit_response = client.message(msg=income_message)
            # print ("AI DETECTION =======>: ", wit_response)
        except:
            return None
    return wit_response


async def witai_check(bot_info, wit_response, text):
    if wit_response is not None and isinstance(wit_response.get('intents', None), list) and len(wit_response['intents']) > 0:
        intents = wit_response['intents']
        picked_intent = None
        for intent in intents:
            if float(intent.get('confidence', 0)) >= 0.6:
                if picked_intent is None or picked_intent.get('confidence') < intent.get('confidence', 0):
                    picked_intent = intent
    
        if picked_intent is not None:
            rule = await motordb.db['rule'].find_one({'bot_id': str(bot_info['_id']), 'intent': picked_intent.get('name')})
            if rule is not None:
                return rule
    return None


async def witai_pick_intents(wit_response):
    picked_intent = None
    if wit_response is not None and isinstance(wit_response.get('intents', None), list) and len(wit_response['intents']) > 0:
        intents = wit_response['intents']
        for intent in intents:
            if float(intent.get('confidence', 0)) > 0.6:
                if picked_intent is None or picked_intent.get('confidence') < float(intent.get('confidence', 0)):
                    picked_intent = intent

    return picked_intent