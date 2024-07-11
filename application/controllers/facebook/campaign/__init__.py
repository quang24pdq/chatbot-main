# import ujson
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

# from application.controllers.facebook.base import pre_post_set_position
# from application.controllers.tenant import set_tenant, get_current_tenant_id
# from application.common.helpers import merge_objects, convert_template, convert_phone_number, hash_string
# from application.common.file_helper import read_template
# from application.controllers.user import get_current_user

# from facebook_business.api import FacebookAdsApi
# from facebook_business.adobjects.adaccount import AdAccount
# from facebook_business.adobjects.campaign import Campaign
# from facebookads.adobjects.adset import AdSet
# from facebookads.adobjects.targeting import Targeting
# from facebookads.adobjects.adcreative import AdCreative
# from facebookads.adobjects.adcreativelinkdata import AdCreativeLinkData
# from facebookads.adobjects.adcreativeobjectstoryspec import AdCreativeObjectStorySpec
# from facebook_business.adobjects.ad import Ad
# from facebook_business.adobjects.customaudience import CustomAudience

# APP_ID = app.config.get('FB_APP_ID')
# APP_SECRET = app.config.get('FB_APP_SECRET_KEY')
# AD_ACCOUNT_ID = '2879028182142042'  
# ACCESS_TOKEN = 'EAAbxuhuFECgBAFjra1gP8orM8leh7lzMXZCcD6E3hAXrKlZBCWH8ExiNsZClaRc5fGhZBMrGZBj9qGuErlpPT7oZBfWGTud7w9DkCDeIPYf56g52lbrkZALAmUdal33symCumQqkm44OwHZBI8vLKLuWUUeHnDQxSJsPtRfNxM72n2GKvuLDgcJ9qqj1iqbnL4YZD'

# # FacebookAdsApi.init(app_id=APP_ID, app_secret=APP_SECRET, access_token=ACCESS_TOKEN)


# class FbAdCampaign:
#     id = None
#     campaign_name = "Sponsored Messenger"
#     objective = "MESSAGES"
#     status = "PAUSED"
#     special_ad_categories = []
#     timestamp = 0


# class FbCustomAudience:
#     id = None
#     name = ""
#     subtype = "CUSTOM"
#     description = "People who purchased on my website"
#     customer_file_source = "USER_PROVIDED_ONLY"
#     payload = {
#         "schema": ["PHONE"],
# 		"data": [
# 			["786ecf43afbd8d2c3e40c24803baa2227e84c810b1952a76074f7dd64e96d460"]
# 		]
#     },
#     timestamp = 0


# class FbAdSet:
#     id = None






# async def create_campaigns(request, ads_account_id):
#     # url = 'https://graph.facebook.com/v7.0/act_'+ads_account_id+'/campaigns'
#     # access_token = ACCESS_TOKEN
#     # app_secret = APP_SECRET
#     # app_id = APP_ID
#     # id = AD_ACCOUNT_ID
#     # FacebookAdsApi.init(app_id=app_id, app_secret=app_secret, access_token=access_token)
#     fields = []
#     params = {
#         'name': 'Sponsored Message Campaign',
#         'objective': 'MESSAGES',
#         'status': 'PAUSED',
#         'special_ad_categories': [],
#     }

#     result = AdAccount("act_" + AD_ACCOUNT_ID).create_campaign(
#         fields=fields,
#         params=params,
#     )
#     return result


# async def create_adsets(request, ad_account_id, campaign_id):

#     URL = app.config.get("FACEBOOK_GRAPH_URL") + '/act_'+AD_ACCOUNT_ID+'/adsets?access_token=' + ACCESS_TOKEN
#     data = {
#         "name": "My Sponsored Adsets",
#         "optimization_goal": "IMPRESSIONS",
#         "billing_event": "IMPRESSIONS",
#         "bid_amount": 200,
#         "daily_budget": 100000,
#         "campaign_id": campaign_id,
#         "targeting": {
#             "custom_audiences": [
#                 {"id": 23844839017910753}
#             ]
#         },
#         "status": AdSet.Status.paused
#     }
#     response = await HTTPClient.post(URL, data=ujson.dumps(data))

#     print ("response ", response)
#     return response


# async def create_adcreatives(request, page_id, content):

#     img_data = await create_fbad_hash_image()
#     hash_img = img_data['data'][0].get('hash')
#     # print ("<>>>>>>> ", hash_img)

#     URL = app.config.get("FACEBOOK_GRAPH_URL") + '/act_'+AD_ACCOUNT_ID+'/adcreatives?access_token=' + ACCESS_TOKEN
#     data = {
#         "name": "Sample Creative for Messenger",
#         "object_story_spec": {
#             "link_data": {
#                 "call_to_action": {
#                     "type": "LEARN_MORE",
#                     "value": {
#                         "app_destination": "MESSENGER"
#                     }
#                 },
#                 "image_hash": hash_img,
#                 "link": "https://www.upgo.vn",
#                 "message": "Welcome message"
#             },
#             "page_id": page_id
#         }
#     }
#     response = await HTTPClient.post(URL, data=ujson.dumps(data))

#     return response


# async def create_ads(request, adset_id, adcreative_id):
#     # url = 'https://graph.facebook.com/v7.0/act_2879028182142042/ads?access_token=EAAbxuhuFECgBAISZB8TmAzBDscDDD4EfjXhqz9CrUTA8TwDCmbXwXlDGhYcFFh0an1MPw0AKkq95VizF0e01XecZBfoxBx3qFJY71Y92PrZBcLZAw22jsoMSi4HOvlexSZA4dgbiSV9K0aEdhZABgFqPIl8ZCTthZC0EkgThaoHPnD2JKxZA6eCj7'
#     access_token = ACCESS_TOKEN
#     app_secret = APP_SECRET
#     app_id = APP_ID
#     id = AD_ACCOUNT_ID
#     FacebookAdsApi.init(access_token=access_token)

#     fields = [
#     ]
#     params = {
#         'name': 'My Ad',
#         'adset_id': adset_id,
#         'creative': {'creative_id': adcreative_id},
#         'status': 'PAUSED',
#     }
#     ad = AdAccount(id).create_ad(
#         fields=fields,
#         params=params,
#     )
#     return ad


# # 
# async def create_custom_audiences(request):
#     # url = 'https://graph.facebook.com/v7.0/act_2879028182142042/customaudiences'
#     access_token = ACCESS_TOKEN
#     app_secret = APP_SECRET
#     app_id = APP_ID
#     id = AD_ACCOUNT_ID
#     FacebookAdsApi.init(access_token=access_token)

#     fields = []
#     params = {
#         'name': 'My new Custom Audience',
#         'subtype': 'CUSTOM',
#         'description': 'People who purchased on my website',
#         'customer_file_source': 'USER_PROVIDED_ONLY',
#     }
#     custom_audience_result = AdAccount(id).create_custom_audience(fields=fields, params=params,)

#     return custom_audience_result


# async def add_users_to_custom_audiences(request, audience_id):

#     access_token = ACCESS_TOKEN
#     url = 'https://graph.facebook.com/v7.0/'+str(audience_id)+'/users?access_token=' + access_token
#     data = {
#         "payload": {
#             "schema": [
#                 "UID",
#                 "PHONE"
#             ],
#             "app_ids": [
#                 "852024851561606",
#                 "852024851561606"
#             ],
#             "data": [
#                 [
#                     "1520789767959544",
#                     "786ecf43afbd8d2c3e40c24803baa2227e84c810b1952a76074f7dd64e96d460"
#                 ],
#                 [
#                     "2055688647843474",
#                     ""
#                 ]
#             ]
#         }
#     }

#     result = await HTTPClient.post(url, data=ujon.dumps(data))
#     print (result)
#     return None


# async def create_fbad_hash_image():
#     # URL = 'https://graph.facebook.com/v2.11/act_<AD_ACCOUNT_ID>/adimages'
#     URL = app.config.get("FACEBOOK_GRAPH_URL") + '/act_'+AD_ACCOUNT_ID+'/adimages'
    
#     params = {
#         'filename': '/opt/deploy/UpBOT/repo/static/images/iphone.png',
#         'access_token': ACCESS_TOKEN
#     }

#     response = await HTTPClient.get(URL, params=params)

#     return response


# @app.route('/api/v1/campaign_test', methods=['POST', 'GET'])
# async def create_campaign_test(request, **kw):

#     campaign_result = await create_campaigns(request, AD_ACCOUNT_ID)
#     campaign_id = campaign_result.get('id')
#     print ("campaign_id ", campaign_id)

#     adset_id = await create_adsets(request, AD_ACCOUNT_ID, campaign_id)
#     print ("adset_id ", adset_id)

#     adcreative_id = await create_adcreatives(request, "852024851561606", {})
#     print ("adcreative_id ", adcreative_id)

#     ad = await create_ad(request, adset_id, adcreative_id)
#     print ("AD ", ad)

#     return json(None)


# @app.route('/api/v1/adset', methods=['POST', 'GET'])
# async def create_campaign_test(request, **kw):
#     global AD_ACCOUNT_ID

#     # await create_custom_audiences(request)

#     # campaign_id = request.args.get('campaign_id')
#     # adset_id = await create_adsets(request, AD_ACCOUNT_ID, campaign_id)
#     # print ("adset_id ", adset_id)

#     return json(None)


# @app.route('/api/v1/adcreatives', methods=['POST', 'GET'])
# async def api_create_adcreatives(request, **kw):
#     global AD_ACCOUNT_ID

#     response = await create_adcreatives(request, "852024851561606", {})

#     # await create_custom_audiences(request)

#     # campaign_id = request.args.get('campaign_id')
#     # adset_id = await create_adsets(request, AD_ACCOUNT_ID, campaign_id)
#     print ("response ", response)

#     return json(None)


# @app.route('/api/v1/campaign/create_custom_audience', methods=['POST', 'GET'])
# async def api_create_custom_audience(request, **kw):

#     await create_custom_audiences(request)

#     return json(None)



# @app.route('/custom_audience')
# async def get_custom_audience(request):

#     cusor = motordb.db['contact'].find({'bot_id': '5c03e01342a3162f89b1e76e'})

#     results = [
#         [hash_string('+84344956594'), hash_string('Nguyễn'), hash_string('Hưng')],
#         [hash_string('+84964689609'), '', ''],
#         [hash_string('+84392365235'), '', ''],
#         [hash_string('+84916121289'), '', ''],
#         [hash_string('+84385635499'), '', ''],
#         [hash_string('+84353989796'), '', '']
#     ]
#     limit = 200
#     count = 0
#     async for _ in cusor:
#         if _.get('phone') is not None and convert_phone_number(_.get('phone'), "+84") is not None:
#             count += 1
#             print ("count ", count)
#             if count <= limit:
#                 results.append([
#                     hash_string(convert_phone_number(_.get('phone'), "+84")),
#                     hash_string(_.get('first_name')) if _.get('first_name') is not None else '',
#                     hash_string(_.get('last_name')) if _.get('last_name') is not None else ''
#                 ])
#                 # results.append(convert_phone_number(_.get('phone'), "+84"))

#         if count == limit:
#             break

#     return json({
#         'num': len(results),
#         'data': results
#     })
