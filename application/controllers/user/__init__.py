import time, requests, ujson
from datetime import datetime
from sqlalchemy import and_, or_
from gatco.response import json, text, html
from application.extensions import apimanager
from application.extensions import auth
from application.server import app
from gatco.exceptions import ServerError
from gatco_restapi import ProcessingException
from gatco_restapi.helpers import to_dict
from application.database import motordb
from application.client import HTTPClient
from bson.objectid import ObjectId
from application.common.file_helper import read_template
from application.common.constants import ERROR_CODE, ERROR_MSG, STATUS_CODE
from application.common.helpers import now_timestamp
from application.controllers.tenant import get_current_tenant_id
from application.controllers.base import ACCESS_TOKEN


@auth.user_loader
def user_loader(token):
    if token is not None:
        if 'exprire' in token:
            if token['exprire'] < time.time():
                return None
            del(token["exprire"])

        return token
    return None


def get_current_user(request, **kw):
    return auth.current_user(request)


@app.route('/logout')
def logout(request):
    try:
        auth.logout_user(request)
    except:
        pass
    return json({})


async def get_user_with_permission(uid):
    user = await motordb.db['user'].find_one({"_id": ObjectId(uid)})
    if user is not None:
        if "password" in user:
            del user['password']
        user["_id"] = str(user["_id"])
    return user


@app.route('/current_user', methods=['GET', 'POST'])
async def current_user(request):

    if app.config.get("APP_MODE") == 'development':
        return json({
            "_id": "5ed6659e3ba3b1ef8a12e268",
            "id": "b5920033-e7ad-4545-b1d5-41a9e923b69a",
            "display_name": "Ha Toan",
            "phone": "0348625050",
            "email": "thahuy920@gmail.com",
            "gender": None,
            "profile_pic": None,
            "facebook_id": "2700435456891334",
            "facebook_name": None,
            "tenants": [
                {
                    "id": "demo",
                    "tenant_no": None,
                    "tenant_name": "Demo",
                    "business_line": "restaurant",
                    "phone": None,
                    "email": None,
                    "image_url": "https:\/\/static.upgo.vn\/upload\/accounts\/998474543731576745081836.jpg",
                    "address": "S\u1ed1 25 ng\u00f5 29 Khu\u1ea5t Duy Ti\u1ebfn",
                    "active": True,
                    "extra_data": {},
                    "role": "admin",
                    "confirmed_at": 1591097927072
                }
            ],
            "last_login_tenant": "demo",
            "created_at": 1591109022267,
            "config": {
                "lang": "VI"
            },
            "access_token": "EAAbxuhuFECgBAMLI4gP8XmkgLXxFm9DzFwURYGUdhkSsU6jm5vsSXJEguJ4hCi7ALV2KCC7IT2IorZBgCaviAjlHulI2ZA3UtkBMcf1m9p3qDZAqUPUJ64Dvx1PZBXx7cZBIfsmyhTkZAZAtTXujMFyeuSegBdHX884N9MhytjmFbXjxWRJTMyH9qayuGungy8j5JqgC3987gZDZD",
            "token_expired_in": 4475,
            "current_tenant_id": "demo",
            "suggested_task": {}
        })

    current_user = auth.current_user(request)
    print('current_user ', current_user)
    if current_user is None:
        return json({
            "error_code": ERROR_CODE['AUTH_ERROR'],
            "error_message": ERROR_MSG['AUTH_ERROR']
        }, status=STATUS_CODE['AUTH_ERROR'])

    current_tenant_id = request['session'].get('current_tenant_id', None)
    print ("current_tenant_id ", current_tenant_id)

    tenant_list = []
    response = requests.get(app.config.get('UPGO_ACCOUNT_URL') + '/api/v1/me/tenants',\
            params={'id': current_user.get('id'), 'access_token': ACCESS_TOKEN})
    if response.status_code == 200:
        tenant_list = response.json()

    result = None
    chatbot_user = await motordb.db['user'].find_one({'id': str(current_user.get('id'))})
    if chatbot_user is None:
        chatbot_user = {
            'id': str(current_user['id']),
            'display_name': current_user.get('display_name'),
            'phone': current_user.get('phone'),
            'email': current_user.get('email'),
            'gender': current_user.get('gender'),
            'profile_pic': current_user.get('avatar_url'),
            'facebook_id': None,
            'facebook_name': None,
            'tenants': tenant_list,
            'last_login_tenant': current_user.get('last_login_tenant', None),
            'created_at': now_timestamp(),
            'config': {}
        }
        user_result = await motordb.db['user'].insert_one(chatbot_user)
        chatbot_user['_id'] = str(user_result.inserted_id)
        result = chatbot_user
    else:
        chatbot_user['display_name'] = current_user.get('display_name')
        chatbot_user['profile_pic'] = current_user.get('avatar_url')
        chatbot_user['tenants'] = tenant_list

        await motordb.db['user'].update_one({'_id': ObjectId(chatbot_user.get('_id'))}, {'$set': chatbot_user})

        result = chatbot_user
        result['_id'] = str(result['_id'])

    if result is not None:
        result['config'] = chatbot_user['config']
        result["current_tenant_id"] = get_current_tenant_id(request)
        read_tasks = read_template("tasks.json")
        tasks_to_string = str(read_tasks)
        # template_string = convert_template(template_to_string, to_translate_tpl_data)
        tasks = ujson.loads(tasks_to_string)
        
        suggested_task = None
        if tasks is not None and isinstance(tasks, list):
            if chatbot_user is None or chatbot_user.get('completed_tasks') is None or not isinstance(chatbot_user['completed_tasks'], list):
                suggested_task = tasks[0]
            else:
                # a.index(3)
                for _ in tasks:
                    try:
                        chatbot_user['completed_tasks'].index(_['_id'])
                    except:
                        suggested_task = _
                        break

        result['suggested_task'] = suggested_task

        return json(result)

    return json({
        "error_code": "USER_NOT_FOUND",
        "error_message": "User does not exist"
    }, status=520)


@app.route('/api/v1/user/fbauth', methods=['POST'])
async def fbauth(request):
    # CHECK ACCESS
    session_user = auth.current_user(request)
    if session_user is None:
        return json({
            "error_code": ERROR_CODE['AUTH_ERROR'],
            "error_message": ERROR_MSG['AUTH_ERROR']
        }, status=STATUS_CODE['AUTH_ERROR'])

    # accessToken: "EAAbxuhuFECgBAKUkQtupjD8CVNDHaQz7ZCoYYxrrChxFgoy7X0oZA5xKfANgClfXDDUHsQ1mTqRkPpwukcUkUG3WHVF3h1lOHItF6nvQZBcH91OkoglcvM5u1brIPj19QMAq6T7u2mOW3JDydExgNu4SGLmZAFkvILMNhYKfPAI0g0Pj7DQgUX65qfS0Yca7Bi38Q6T53AZDZD"
    # data_access_expiration_time: 1598344281
    # expiresIn: 5228
    # graphDomain: "facebook"
    # signedRequest: "shJaWT6ft5sEINRQp6HEgBU3D5_WthkZl5pGS8jPkfg.eyJ1c2VyX2lkIjoiMTE1NzIwMzkwNzc1MjM3NSIsImNvZGUiOiJBUUI5cmozdjR0UmtDVzBKVHBYQmtPRFlzX29rV0ItLTBpVHM2Qmpic0QxenM1eWNnQWtieEdqRmthZ0tlZzBSRWhLWHVRcmlGNG04b0xGZl9WbUpZUmVaSm9PSW1NOHNKTlNENFZ4a1dEQkxSU3RkNDNvRnZQNG5kZ3VxVjZHSHdiZGpYQ1JoWG9yejRHWU1qY19TRW9CbWZCX1Q4NEhCTUFTWmFQN0pMTWlIYXY5MjhUVlhmSERNZWs0dXd6b2pHMThLNjVrckRMaWMybTExdkhJY2VsOVg0eVI3Z2RGbG1qbzY2RkQ1X01aS2JycGNCSjNvV0hkU014bi1panV2SlU3YmNMSDQ2Y0gzQ0hoRGk4WlN4NnB2RDBieGFkS3lWWmtPdV84WklXWWVnZDlmcU5Rd0tNY1pMSWpabE5Xc0dtbVNlaEFrMDFUY29hb2Rac3hWaENILSIsIm9hdXRoX3Rva2VuIjoiRUFBYnh1aHVGRUNnQkFLVWtRdHVwakQ4Q1ZOREhhUXo3WkNvWVl4cnJDaHhGZ295N1gwb1pBNXhLZkFOZ0NsZlhERFVIc1ExbVRxUmtQcHd1a2NVa1VHM1dIVkYzaDFsT0hJdEY2bnZRWkJjSDkxT2tvZ2xjdk01dTFicklQajE5UU1BcTZUN3UybU9XM0pEeWRFeGdOdTRTR0xtWkFGa3ZJTE1OaFlLZlBBSTBnMFBqN0RRZ1VYNjVxZlMwWWNhN0JpMzhRNlQ1M0FaRFpEIiwiYWxnb3JpdGhtIjoiSE1BQy1TSEEyNTYiLCJpc3N1ZWRfYXQiOjE1OTA1NjgzNzJ9"
    # userID: "1157203907752375"
    body_data = request.json
    user = await motordb.db['user'].find_one({'id': str(session_user.get('id'))})
    if user is not None:
        user['facebook_id'] = body_data.get('userID')
        user['access_token'] = body_data.get('accessToken')
        user['token_expired_in'] = body_data.get('expiresIn')

    await motordb.db['user'].update_one({'_id': ObjectId(user['_id'])}, {'$set': user})
    user['_id'] = str(user['_id'])
    return json(user)

@app.route("/api/v1/user/set-config", methods=["POST", "PUT"])
async def set_user(request):
    config_data = request.json
    id = request.args.get("id")
    user = await motordb.db['user'].find_one({"id": str(id)})
    if user is None:
        return json(None)

    user['config'] = config_data

    await motordb.db['user'].update_one({'_id': ObjectId(user['_id'])}, {'$set': user})
    user['_id'] = str(user['_id'])

    return json(user)