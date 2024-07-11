# from datetime import datetime
# from copy import deepcopy
# from application.extensions import auth
# from application.server import app
# from gatco.response import json, text
# from gatco_restapi.helpers import to_dict
# from application.extensions import apimanager
# from bson.objectid import ObjectId
# from application.database import motordb
# from application.client import HTTPClient
# from application.common.constants import STATUS_CODE, ERROR_CODE, ERROR_MSG
# from application.common.helpers import now_timestamp, get_milisecond, current_local_datetime,\
#     get_days_from_date, get_utc_from_local_datetime
# from application.common.email import send_mail

# from application.controllers.tenant import set_tenant, get_current_tenant_id
# from application.common.helpers import merge_objects, convert_template
# from application.common.file_helper import read_template
# from application.controllers.user import get_current_user


# CREATE A SET OF AUDIENCES FROM USER PROFILE (id, Email, Phone,..) from CRM system
# USER_PROVIDED_ONLY: Advertisers collected information directly from customers.
# PARTNER_PROVIDED_ONLY: Advertisers sourced information directly from partners (e.g. agencies or data providers).
# BOTH_USER_AND_PARTNER_ PROVIDED: Advertisers collected information directly from customers and it was also sourced from partners (ex: agencies).
# @RETURN
# audience_id: numeric string
# session_id: numeric string
# num_received: int32
# num_invalid_entries: int32
# invalid_entry_samples: Map { string: string }
# async def create_custom_audiences(request):
#     data = {
#         'name': 'Custom Audiences',
#         'subtype': 'CUSTOM',
#         'description': 'People who purchased on my website',
#         'customer_file_source': 'USER_PROVIDED_ONLY',
#         'access_token': ''
#     }
#     URL = app.config.get('FACEBOOK_GRAPH_URL') + 'act_' + str(ads_account_id) + '/customaudiences'


# async def create_custom_audiences(request):
#     data = {
#         'name': 'Custom Audiences',
#         'subtype': 'CUSTOM',
#         'description': 'People who purchased on my website',
#         'customer_file_source': 'USER_PROVIDED_ONLY',
#         'access_token': ''
#     }
#     URL = app.config.get('FACEBOOK_GRAPH_URL') + 'act_' + str(ads_account_id) + '/customaudiences'

