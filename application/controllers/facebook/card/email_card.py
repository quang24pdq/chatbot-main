import json
from bson.objectid import ObjectId
from application.common.email import send_mail
from application.database import motordb, logdb
from application.common.helpers import merge_objects, convert_template


async def card_handler(card, bot, contact, block_id, messaging_type='message'):
    if card:
        if contact is None:
            return False
        else:
            email = card.get('email', None)
            subject = card.get('title', None)
            email_body = card.get('email_body', None)
            if email or email_body:
                print("card_handler.email error====", email)
            else:
                # try:
                if email_body is not None:
                    # try:
                    bot_info = await motordb.db['bot'].find_one({"_id": ObjectId(bot.bot_id)})
                    data = merge_objects(bot_info, contact)
                    email_content = convert_template(email_body, data)

                    result = await send_mail(email, subject, email_content)

                    # except:
                    #     print("can not parser text card==============================")
                # except:
                #     print('exception send_mail')

    return None