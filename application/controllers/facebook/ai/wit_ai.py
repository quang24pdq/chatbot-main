import time
import uuid
from math import floor
from application.database import motordb
from bson.objectid import ObjectId
from application.common.helpers import merge_objects, now_timestamp, validate_phone, phone_regex
from application.controllers.facebook.contact import update_contact
from application.controllers.facebook.message.messaging_session import update_session_detection, get_session_detection
from wit import Wit

GENDER_MAP = {
    'male': 'Anh',
    'female': "Chị"
}


async def wit_ai_handle(bot_info, contact, income_message):
    wit_response = None

    if bot_info.get('wit', None) is not None and bot_info['wit'].get('token', None) is not None:
        try:
            wit_token = bot_info['wit'].get('token', None)
            client = Wit(access_token=wit_token)
            # wit_response = client.message(msg=income_message, context={'session_id': str(contact.get('id', str(uuid.uuid4())))})
            wit_response = client.message(msg=income_message)
            # print ("AI DETECTION =======>: ", wit_response)
            if wit_response is not None and wit_response.get('entities', None) is not None:
                contact_data = {}
                detected_type = None
                booking_data = {
                        'timestamp': now_timestamp(),
                        'message': wit_response['_text']
                    }
                is_requirement = 0
                
                for key in wit_response['entities']:
                    if key == 'phone_number':
                        detected_type = 'phone_number'
                        is_requirement += 1
                        contact_data['phone_numbers'] = contact.get("phone_numbers", [])
                        for _ in wit_response['entities'][key]:
                            if float(_['confidence']) > 0.6:
                                phone = phone_regex(_['value'])
                                if validate_phone(phone) == True:
                                    try:
                                        if contact_data['phone_numbers'].index(phone) >= 0:
                                            pass
                                    except:
                                        contact_data['phone_numbers'] = [phone] + contact_data['phone_numbers']

                                    booking_data['phone'] = phone
                                    contact_data['phone'] = phone

                    elif key == 'gender':
                        for _ in wit_response['entities'][key]:
                            try:
                                if float(_['confidence']) > 0.8:
                                    contact_data['gender'] = GENDER_MAP[_['value']]
                                    booking_data['gender'] = _['value']
                            except:
                                pass
                    
                    elif key == 'date':
                        # for _ in wit_response['entities'][key]:
                        #     try:
                        #         if float(_['confidence']) > 0.8:
                        #             contact_data['gender'] = GENDER_MAP[_['value']]

                        #     except:
                        pass

                    elif key == 'booking':
                        detected_type = 'booking'
                        if wit_response['entities'].get('datetime', None) is not None and len(wit_response['entities']['datetime']) > 0:
                            is_requirement += 1
                            booking_data['datetime'] = {}
                            dt = None
                            if wit_response['entities']['datetime'][0].get('value', None) is not None:
                                dt = wit_response['entities']['datetime'][0].get('value', None)
                                booking_data['datetime']['value'] = dt
                            elif wit_response['entities']['datetime'][0].get('values', None) is not None:
                                dt = wit_response['entities']['datetime'][0].get('values', None)
                                booking_data['datetime']['values'] = dt

                    elif key == 'people_number':
                        for _ in wit_response['entities'][key]:
                            try:
                                if float(_['confidence']) > 0.8:
                                    booking_data['booking_for_people_number'] = _['value']
                            except:
                                pass

                # if is_requirement >= 2:
                #     booking_data['booking_requirement'] = income_message

                if len(booking_data) > 0:
                    await update_session_detection(bot_info['page_id'], contact, detected_type, booking_data)

                contact = await update_contact(contact, contact_data)
        except:
            return None
    return wit_response



async def witai_check(bot_info, wit_response, text):

    if wit_response is not None and wit_response.get('entities', None) is not None and isinstance(wit_response['entities'], dict) and len(wit_response['entities'].keys()) > 0:
        entities = wit_response['entities']
        for key in entities.keys():
            for entity in entities[key]:
                if float(entity.get('confidence', 0)) >= 0.7:
                    rule = await motordb.db['rule'].find_one({'bot_id': str(bot_info['_id']), 'entity': key})
                    if rule is not None:
                        # if key == 'greetings' and float(entity.get('confidence', 0)) >= 0.9:
                        #     # suggested message
                        #     rule['suggested'] = entity.get('value', None)
                        return rule

    return None

