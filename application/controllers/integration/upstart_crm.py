from copy import deepcopy
from datetime import datetime
from gatco.response import json
from bson.objectid import ObjectId
from application.extensions import apimanager
from application.server import app
from application.database import motordb
from application.controllers.tenant import set_tenant
from application.common.helpers import now_timestamp, merge_objects
from application.common.constants import ERROR_MSG, ERROR_CODE, STATUS_CODE


UPGO_TOKEN_FOR_CRM = 'B4E5NDLUS3FCK4GTAVHSOMER42BDU5YVZ26D6IX4BI6LCS4SDRA7JVODNQHNL5OADKT9SWJU5FLNDW6HTME379M0PTTG47G8IGNG2XGDISRMEN9DZD6DSZJ7I3DT007O'


def verify_token(request):
    token = request.headers.get('UPSTART-TOKEN', None)
    if token != UPGO_TOKEN_FOR_CRM:
        return json({
            "error_code": ERROR_CODE['AUTH_ERROR'],
            "error_message": ERROR_MSG['AUTH_ERROR']
        }, status=STATUS_CODE['AUTH_ERROR'])


@app.route('api/v1/integration/crm/contact/info', methods=['GET'])
async def crm_get_contact_info(request):
    verify_token(request)
    # auth = verify_token(request)
    # if auth is not None and auth.get('valid', None) == False:
    #     return json({
    #         'error_code': auth.get('error_code'),
    #         'error_message': auth.get('error_message')
    #     }, status=auth.get('status'))

    bot_id = request.args.get('bot_id')
    page_scope_id = request.args.get('page_scope_id')

    contact = await motordb.db['contact'].find_one({'bot_id': bot_id, 'id': page_scope_id})
    if contact is not None:
        result = {
            'page_scope_id': contact.get('id'),
            'name': contact.get('name'),
            'phone': contact.get('phone'),
            'client_mac': contact.get('client_mac'),
            'gender': contact.get('gender'),
            'page_id': contact.get('page_id'),
            'page_name': contact.get('page_name')
        }

        return json(result)

    return json(None)


