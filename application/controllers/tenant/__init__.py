import ujson, copy
from datetime import datetime
from application.server import app
from gatco.response import json
from bson.objectid import ObjectId
from application.extensions import auth
from application.database import motordb
from application.common.constants import ERROR_CODE, ERROR_MSG, STATUS_CODE
from application.common.helpers import now_timestamp


def filter_tenant(search_params,request=None, **kw):
    currentUser = auth.current_user(request)
    if 'group_id' in currentUser and currentUser['group_id'] is not None:
        tenant_id = request['session'].get(currentUser['group_id']+'_current_tenant', None)

        if tenant_id is not None:
            search_params["filters"] = ("filters" in search_params) and {"$and":[search_params["filters"], {"tenant_id":{"$eq": tenant_id}}]}   


def get_current_tenant_id(request):
    return request['session'].get('current_tenant_id')


def set_tenant(request=None, data=None, **kw):
    if app.config.get('APP_MODE') == 'development':
        data['tenant_id'] = "demo"
        data["created_at"] = now_timestamp()
        data["updated_at"] = now_timestamp()
    else:
        tenant_id = get_current_tenant_id(request)
        if tenant_id is None:
            return json({"error_code":"TENANT_NOT_SET","error_message":"TENANT_NOT_SET"},status=520)
        if data is not None:
            data["tenant_id"] = tenant_id
        data["created_at"] = now_timestamp()
        data["updated_at"] = now_timestamp()


@app.route("/api/v1/set_current_tenant", methods=["POST"])
async def set_current_tenant(request):
    user = auth.current_user(request)
    if user is not None:
        data = request.json
        request['session']['current_tenant_id'] = data.get("tenant_id")
        return json({})
    
    return json({"error_code": ERROR_CODE['AUTH_ERROR'], "error_message": ERROR_MSG['AUTH_ERROR']}, status=STATUS_CODE['AUTH_ERROR'])



@app.route('/api/v1/sync/tenant', methods=['POST'])
async def sync_tenant_info(request):

    body_data = request.json

    tenant_id = body_data.get('id')

    cursor = motordb.db['bot'].find({'tenant_id': tenant_id})

    async for bot in cursor:
        bot_info = copy.deepcopy(bot)

        bot_info['business_line'] = body_data.get('business_line')

        await motordb.db['bot'].update_one({'_id': ObjectId(str(bot_info['_id']))}, {'$set': bot_info})

    return json({})
