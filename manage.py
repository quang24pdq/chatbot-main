""" Module for managing tasks through a simple cli interface. """
# Libraries
import sys
import json
import csv
import datetime
from gatco.response import json, text
from application.server import app
from bson.objectid import ObjectId
from application.extensions import auth
from application.database import motordb
from application import run_app
from manager import Manager

from os.path import abspath, dirname
sys.path.insert(0, dirname(abspath(__file__)))


# Constants.
manager = Manager()


@app.route('/import_259tohieu_gochanoi', methods=['GET'])
async def importcontact_gochanoi(request):
    botid = request.args.get("bot_id", None)
    pageid = request.args.get("page_id", None)
    if botid is None or pageid is None:
        return text('param error')

    with open('/opt/deploy/chatbottest/repo/gochanoi2.csv') as csv_file:
        csv_reader = csv.reader(csv_file, delimiter=',')
        line_count = 0
        arr_column_name = []
        for row in csv_reader:
            if line_count == 0:
                print(f'{", ".join(row)}')
                arr_column_name = row[:]

                arr_custom_attrs = arr_column_name[41:]
                print('arr_custom_attrs===', arr_custom_attrs)
                update_bot_attributes = await motordb.db['bot'].find_one({'_id': ObjectId(botid)})
                if update_bot_attributes is not None:
                    if "user_define_attribute" not in update_bot_attributes:
                        update_bot_attributes["user_define_attribute"] = []
                    bot_attrs = update_bot_attributes["user_define_attribute"]
                    for att in arr_custom_attrs:
                        if att not in bot_attrs:
                            bot_attrs.append(att)

                    update_bot_attributes["user_define_attribute"] = bot_attrs
                    await motordb.db['bot'].update_one({'_id': ObjectId(botid)}, {'$set': update_bot_attributes})

                line_count += 1

            else:
                line_count += 1

                if (row[5] is None or row[5] == ''):
                    created_at = None
                else:
                    created_at = None
                contact = {
                    "created_at": created_at,
                    "updated_at": None,
                    "id": row[1],
                    "page_id": pageid,
                    "bot_id": botid,
                    "contact_type": "facebook_psid",
                    'first_name': row[6],
                    'last_name': row[7],
                    'gender': row[8],
                    'profile_pic': row[10],
                    'locale': row[11],
                    "timezone": row[9],
                    "sessions": row[12],
                    "custom_attributes": row[13],
                    "ref": row[14],
                    "refs": row[15],
                    "source": row[16],
                    "last_clicked_button_name": row[17],
                    "last_user_freeform_input": row[18],
                    "last_visited_block_id": "",  # row[19],
                    "last_visited_block_name": row[20],
                    "latitude": row[21],
                    "longitude": row[22],
                    "map_url": row[23],
                    "zip": row[24],
                    "address": row[25],
                    "country": row[26],
                    "state": row[27],
                    "city": row[28],
                    "last_purchased_item": row[29],
                    "last_payment_name": row[30],
                    "last_payment_email": row[31],
                    "last_payment_phone": row[32],
                    "last_payment_address": row[33],
                    "last_payment_charge_id": row[34],
                    "subscribed_sequences": row[35],
                    "triggered_sequences": row[36],
                    "status": row[37],
                    "within_24h_window": row[38],
                    "rss_and_search_subscriptions": row[39],
                    "subscribed_rss_and_search_subscriptions": row[40]

                }
                length = arr_column_name.__len__()
                for i in range(41, length):
                    contact[''+str(arr_column_name[i])] = row[i]

                print("contact====", contact)
                check_exist = await motordb.db['contact'].find_one({"id": contact["id"]})
                if check_exist is None:
                    result = await motordb.db['contact'].insert_one(contact)

        return text(f'Processed {line_count} account.')


# RUN CHATBOT
@manager.command
def run():
    """ Starts server on port 10008. """
    run_app(host="0.0.0.0", port=10000)


if __name__ == '__main__':
    manager.main()
