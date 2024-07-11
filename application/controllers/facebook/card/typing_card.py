from bson import json_util
import json
import time
import asyncio
from application.controllers.facebook import check_token_expire


async def card_handler(card, bot, contact, block_id, messaging_type='message'):
    if card is not None:
        value_time = card.get('time')
        if(value_time is None):
            value_time = 1
        try:
            result = bot.send_action(contact["id"], "typing_on")
            await asyncio.sleep(value_time)
            # bot.send_action(contact["id"], "typing_off") #bug - gui lap lai bot neu de cai nay cuoi cung
            # expired = await check_token_expire(result, bot)
            # if expired == True:
            #     bot.send_action(contact["id"], "typing_on")
            if result.get('error', None) is not None:
                contact = await set_unreachable_contact(contact, bot.bot_id)
        except:
            print('exception card_handler typing')
    return None
