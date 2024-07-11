# import asyncio
# from math import floor
# from gatco.views import HTTPMethodView
# from ..application.database import motordb
# #from pymessenger import Bot
# from ..application.server import app
# from ..application.bot import UpBot
# from ..application.controllers.facebook.block import handle_block
# from gatco.response import json, text, html
# #from gatco.exceptions import ServerError
# from bson.objectid import ObjectId
# import os.path
# import time
# from application.client import HTTPClient


# # def bot_broadcast(bot_id, broadcast_id):
# #     this_bot = await motordb.db['bot'].find_one({"_id": ObjectId(bot_id)})

# #     if this_bot is not None:
# #         bot = UpBot(str(this_bot['_id']), this_bot['token'], api_version=3.0)
# #         page_id = this_bot.get("page_id")

# #         if (bot is not None) and (page_id is not None):
# #             # block = await motordb.db['block'].find_one({'_id': ObjectId(broadcast_id)})
# #             broadcast = await motordb.db['broadcast'].find_one({'_id': ObjectId(broadcast_id)})
# #             # contacts = motordb.db['contact'].find({'bot_id': bot_id, "reachable": True})
# #             contacts = motordb.db['contact'].find({'bot_id': bot_id})
# #             for contact in await contacts.to_list(length=100):
# #                 # await handle_block(bot, contact, {"block_id": str(block["_id"]), "type": "broadcast"})
# #                 await handle_block(bot, contact, {"block_id": str(block["_id"]), "type": "broadcast"})
# #                 await asyncio.sleep(0.8)

# #     return json({"status": "OK"})

import requests
import json
# from math import floor
# from gatco.views import HTTPMethodView
# from application.database import motordb
# #from pymessenger import Bot
# from application.config import Config
# from application.server import app
# from application.bot import UpBot
# from application.controllers.facebook.block import handle_block
# from gatco.response import json, text, html
# #from gatco.exceptions import ServerError
# from bson.objectid import ObjectId
# import os.path
# import time
# from application.client import HTTPClient
# from application.common.helpers import now_timestamp


def broadcast_task(data):
    #loop = asyncio.new_event_loop()
    #asyncio.set_event_loop(loop)
    #data["loop"] = loop
    #result = loop.run_until_complete(do_task(data))
    
    broadcast_service = 'https://upstart.vn/chatbot_worker/broadcast/api/v1/send'
    headers = {'Content-type': 'application/json'}
    try:
        r = requests.post(broadcast_service, data = json.dumps(data), headers=headers)
    #       result = await HTTPClient.post(broadcast_service, body_data, {})
        print ("=====<><>", r)
    except:
        pass
    
    return {"status": "OK"}


def loadcontact_task(data):
    service = 'https://upstart.vn/chatbot_worker/conversation/get_all'
    headers = {'Content-type': 'application/json'}
    try:
        r = requests.post(service, data = json.dumps(data), headers=headers)
        print ("=====<><>", r)
    except:
        pass
    
    return {"status": "OK"}

