from copy import deepcopy
from datetime import datetime
from gatco.response import json
from bson.objectid import ObjectId
from application.extensions import apimanager
from application.server import app
from application.database import motordb, logdb
from application.common.helpers import now_timestamp
from application.bot import UpBot
from math import floor
import time
from datetime import datetime


@app.route("/api/v1/contact/get_all_contact", methods=["POST"])
async def get_contact_by_page_id(request):
    data = request.json
    bot_id = data["bot_id"]
    if bot_id is None:
        return json({"error": "bot_id is None"})

    cusor = motordb.db["contact"].find({"bot_id": bot_id}).limit(100)
    result = []
    if cusor is not None:
        async for _ in cusor:
            _["_id"] = str(_["_id"])
            # contact = logdb.db["message_log"].find({""})
            result.append(_)
    # print("result", result)
    return json(result)

@app.route("/api/v1/message/get_message_user", methods=["POST"])
async def get_message_user(request):
    data = request.json
    contact_id = data["id"]
    if contact_id is not None:
        cusor = logdb.db["message_log"].find({"contact_id": contact_id, "type": {'$exists': False}})
        result = []
        if cusor is not None:
            async for _ in cusor:
                _["_id"] = str(_["_id"])
                result.append(_)

        return json(result)


@app.route("/api/v1/message/get_message_page", methods=["POST"])
async def get_message_page(request):
    data = request.json
    page_id = data["page_id"]
    contact_id = data["contact_id"]
    if page_id is not None:
        cusor = logdb.db["message_log"].find({"page_id": page_id, "contact_id": contact_id, "type": "page_send"})
        result = []
        if cusor is not None:
            async for _ in cusor:
                _["_id"] = str(_["_id"])
                result.append(_)

        return json(result)


@app.route("/api/v1/livechat/send", methods=["POST"])
async def send_message(request):
    data = request.json
    contact_id = data["contact_id"]
    body = data["text"]
    page_id = data["page_id"]

    start_date = now_timestamp()
    end_date = data["create_at"]

    this_bot = await motordb.db['bot'].find_one({'page_id': page_id})

    if this_bot is not None:    
        bot = UpBot(str(this_bot['_id']), this_bot['token'], api_version=app.config.get('FACEBOOK_API_VERSION', 10.0))
        result = bot.send_text_message(contact_id, body)

        message_log = {
            "_id": result.get("message_id"),
            "create_at": floor(time.time()),
            "contact_id": contact_id,
            "page_id": page_id,
            "text": body,
            "type": "page_send"
        }
        message = await logdb.db['message_log'].insert_one(message_log)


    if end_date is not None:
        cusor = logdb.db['message_log'].find({'$and' : [
            {'create_at': {'$gte': start_date}},
            {'create_at': {'$gt': end_date}},
            {"contact_id": contact_id},
            {"type": {'$exists': False}}
        ]})
        result = []
        if cusor is not None:
            async for _ in cusor:
                result.append(_)
        
        print("result", result)
        return json(result)

