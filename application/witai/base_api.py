import uuid
import time, requests
from datetime import datetime
from math import floor
from bson.objectid import ObjectId
from application.database import motordb
from application.extensions import auth
from application.server import app
from application.client import HTTPClient
from gatco.response import json, text, html
from application.controllers.base import verify_access
from application.common.constants import WIT_APPS
from wit import Wit

WIT_API = 'https://api.wit.ai'


@app.route('/api/v1/wit/intents', methods=['GET'])
async def get_intents(request):
    if request.args.get('id') is None:
        return json([])

    bot_info = await motordb.db['bot'].find_one({'_id': ObjectId(request.args.get('id'))})
    business_line = bot_info.get('business_line', None)
    if business_line is None:
        current_user = auth.current_user(request)
        tenants = current_user.get('tenants')
        if tenants is not None and isinstance(tenants, list):
            for tenant in tenants:
                if tenant.get('id') == bot_info.get('tenant_id'):
                    business_line = tenant.get('business_line')
                    bot_info['business_line'] = business_line
                    await motordb.db['bot'].update_one({'_id': ObjectId(bot_info.get('_id'))}, {'$set': bot_info})

    wit_of_business_line = None
    for wit in WIT_APPS:
        # if wit.get('business_line') == 'restaurant':
        #     wit_of_business_line = wit
        if business_line == wit.get('business_line'):
            wit_of_business_line = wit

    if wit_of_business_line is None:
        return json([])

    url = WIT_API + '/intents'
    headers = {
        'Authorization': 'Bearer ' + wit_of_business_line.get('access_token')
    }
    params = {
        'v': datetime.now().strftime("%Y%m%d")
    }

    response = requests.get(url, params=params, headers=headers)
    if response.status_code == 200:
        intents = response.json()

        return json(intents)

    return json([])


# async def message(wit_app, message):
#     url = WIT_API + "/message"
#     ?v=20200520&q=cho mình đặt bàn ngày mai

#     headers = {
#         'Authorization': 'Bearer ' + wit_of_business_line.get('access_token')
#     }
#     params = {
#         'v': datetime.now().strftime("%Y%m%d"),
#         'q': message
#     }

#     response = await HTTPClient.get(url, params=params, headers=headers)



