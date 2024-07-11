import importlib
from copy import deepcopy
import ujson
import random
import requests
import time
from bson.objectid import ObjectId
from application.server import app
from application.database import motordb
from datetime import datetime
from application.controllers.facebook.bot import update_user_attributes
from application.common.helpers import handle_argument
from application.witai.chatbot_api import wit_ai_handle
from application.common.helpers import convert_phone_number, phone_regex, validate_phone

# {
#     '_current_input': {
#         'current_blocks': [],
#         'current_card': {},
#         'fields': [],
#         'block_loop_counter': {
#             'block_id_1': 1,
#             'block_id_2': 5
#         }
#     }
# }


async def check_block_loop(contact, block_id):
    max_counter = app.config.get('BLOCK_HANDLED_MAX_COUNT', 2)

    if 'block_loop_counter' not in contact['_current_input']:
        contact['_current_input']['block_loop_counter'] = {}

    counter = contact['_current_input']['block_loop_counter'].get(block_id, 0)

    if counter < max_counter:
        contact['_current_input']['block_loop_counter'][block_id] = counter + 1
        await motordb.db['contact'].update_one({'_id': ObjectId(contact["_id"])}, {'$set': contact})
        return False
    return True


async def update_current_input_blocks(contact, block_ids):
    contact['_current_input']['current_blocks'] = block_ids
    # contact['_current_input']['current_contact_input'] = None
    await motordb.db['contact'].update_one({'_id': ObjectId(contact["_id"])}, {'$set': contact})

    return deepcopy(contact)


async def update_current_input_card(contact, current_card):
    contact['_current_input']['current_card'] = current_card
    await motordb.db['contact'].update_one({'_id': ObjectId(contact["_id"])}, {'$set': contact})
    return deepcopy(contact)


async def update_current_contactinputs(contact, fields):
    # if contactinput_id is None:
    #     contact['_current_input']['current_contact_input'] = None
    # else:
    #     contact['_current_input']['current_contact_input'] = {
    #         '_id': contactinput_id,
    #         'fields': deepcopy(fields)
    #     }
    contact['_current_input']['fields'] = deepcopy(fields)
    await motordb.db['contact'].update_one({'_id': ObjectId(contact["_id"])}, {'$set': contact})

    return deepcopy(contact)


def get_current_card(contact):
    if contact is not None and contact.get('_current_input', None) is not None and\
            contact['_current_input'].get('current_card', None) is not None:

        current_card = contact['_current_input']['current_card']
        return current_card

    return None


async def get_next_contactinput(contact):
    if contact is not None and contact.get('_current_input', None) is not None and\
            contact['_current_input'].get('fields', None) is not None and\
            isinstance(contact['_current_input']['fields'], list) and\
            len(contact['_current_input']['fields']) > 0:

        next_card = contact['fields'].pop(0)
        await motordb.db['contact'].update_one({'_id': ObjectId(contact["_id"])}, {'$set': contact})
        return next_card

    return None


async def reset_block_loop_counter(contact, block_id):

    if contact is not None:
        if contact.get('_current_input', None) is None:
            contact['_current_input'] = {}

        if 'block_loop_counter' not in contact['_current_input'] or contact['_current_input'].get('block_loop_counter', None) is None:
            contact['_current_input']['block_loop_counter'] = {}

        if block_id in contact['_current_input']['block_loop_counter']:
            del contact['_current_input']['block_loop_counter'][block_id]
            await motordb.db['contact'].update_one({'_id': ObjectId(contact["_id"])}, {'$set': contact})

        return deepcopy(contact)

    return None


async def reset_current_card(contact):
    contact['_current_input']['current_card'] = None
    await motordb.db['contact'].update_one({'_id': ObjectId(contact["_id"])}, {'$set': contact})

    return deepcopy(contact)


async def cancel_current_input(contact):
    contact['_current_input']['fields'] = []
    # contact['_current_input']['current_card'] = None
    contact['_current_input']['current_blocks'] = []
    contact['_current_input']['block_loop_counter'] = {}
    await motordb.db['contact'].update_one({'_id': ObjectId(contact["_id"])}, {'$set': contact})

    return deepcopy(contact)


async def handle_current_contact_input(request, bot, contact, incomemessage):

    # CHECK CURRENT FIELDS
    # CHECK CURRENT CARD
    # CHECK CURREN BLOCK (?)
    current_input = contact.get("_current_input", None)
    # print("<><><><><><><> ", current_input)
    if current_input is None:
        return True

    fields = current_input.get("fields", [])
    if fields is None or not isinstance(fields, list):
        fields = []

    bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(bot.bot_id)})
    wit_response = await wit_ai_handle(bot_info, contact, incomemessage)
    # print ("wit_response: ", wit_response)

    flag = False
    while len(fields) > 0:
        flag = True
        current_field = fields[0]
        # print(">>>> CURRENT FIELD ", current_field)
        if current_field is not None and current_field.get('value') is None:
            # validate incoming message
            validate = current_field.get("validation", None)
            value_list = current_field.get("value_list", None)

            validated_value = incomemessage
            if validate is not None or validate != 'none' or validate != 'None':
                if validate == "phone":
                    phone = phone_regex(incomemessage)
                    phone = convert_phone_number(phone, 0)
                    if validate_phone(phone) == True:
                        validated_value = phone

                    elif phone is not None and phone.startswith("08") and len(phone) == 10:
                        try:
                            if int(phone) > 0:
                                validated_value = phone
                        except:
                            validated_value = None
                    else:
                        validated_value = None

            if value_list is None and validated_value is None and current_field.get('send_times', 0) < (app.config.get('BLOCK_HANDLED_MAX_COUNT', 2) - 1):
                # repeat message
                fields[0]['send_times'] = current_field.get('send_times', 0) + 1
                # current_input['fields'] = fields
                contact = await update_current_contactinputs(contact, fields)
                # next_text = field.get("text", None)
                next_text = 'Không chính xác, vui lòng nhập lại 🤔'
                bot.send_text_message(
                    contact["id"], handle_argument(next_text, contact))
                return False
            else:
                # QUICK REPLY
                if value_list is not None:
                    if validated_value not in value_list:
                        validated_value = None

                # save to contact
                if current_field.get('attribute', None) is not None and validated_value is not None:
                    contact[current_field.get('attribute')] = validated_value

                    await motordb.db['contact'].update_one({'_id': ObjectId(contact["_id"])}, {'$set': contact})
                    await update_user_attributes(bot.bot_id, current_field.get('attribute'))

                if len(fields) > 1:
                    next_field = fields[1]
                    next_text = next_field.get("text", None)
                    if next_text is not None:
                        bot.send_text_message(
                            contact["id"], handle_argument(next_text, contact))
                        fields.pop(0)
                        contact = await update_current_contactinputs(contact, fields)
                        return False
                else:
                    fields.pop(0)
                    contact = await update_current_contactinputs(contact, fields)

    if flag == True:
        contact = await cancel_current_input(contact)
        # GET CURRENT CARD & CONTINUE FLOW
        current_card = get_current_card(contact)
        # print("GET CURRENT CARD & CONTINUE FLOW ", current_card)
        if current_card is not None:
            block_id = current_card.get('block_id', None)
            position = current_card.get("position", 0)
            from application.controllers.facebook.block import handle_block
            to_be_continue = await handle_block(bot, contact, {"block_id": block_id, "type": "block"}, position)
            if to_be_continue is True:
                return True
            return False
    else:
        contact = await reset_current_card(contact)
    return True
