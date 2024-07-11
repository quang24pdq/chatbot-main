import aiohttp
import asyncio
import ujson
import json as json_load
import requests
from gatco.response import json
from application.server import app


class HTTPClient(object):
    # def __init__(self, url=None):
    #    pass
        #self._url = url
    @staticmethod
    async def get(url, params=None, headers={}):
        #resp = None
        headers["Content-Type"] = "application/json"
        async with aiohttp.ClientSession(headers=headers) as session:
            async with session.get(url, params=params) as response:
                if (response.status == 200) or (response.status == 201):
                    try:
                        resp = await response.json()
                        return resp
                    except:
                        return {"error_code": "HTTP_ERROR", "error_message": await response.text()}
                else:
                    return {"error_code": "HTTP_ERROR", "error_message": await response.text()}
        return {"error_code": "UNKNOWN_ERROR", "error_message": ""}

    @staticmethod
    async def post(url, data, headers={}):
        #resp = None
        # if not ("private_replies" in url):
        headers["Content-Type"] = "application/json"
        async with aiohttp.ClientSession(headers=headers, json_serialize=ujson.dumps) as session:
            async with session.post(url, json=data) as response:
                if (response.status == 200) or (response.status == 201):
                    try:
                        resp = await response.json()
                        return resp
                    except:
                        return {"error_code": "HTTP_ERROR", "error_message": await response.text()}

                else:
                    return {"error_code": "HTTP_ERROR", "error_message": await response.text()}
        return {"error_code": "UNKNOWN_ERROR", "error_message": ""}

    @staticmethod
    def sync_post(url, data, headers={}):
        try:
            requests.post(url, data=json_load.dumps(data), headers=headers)

            return {'ok': True}
        except:
            return {'ok': False}

    @staticmethod
    async def put(url, data, headers={}):
        #resp = None
        headers["Content-Type"] = "application/json"
        async with aiohttp.ClientSession(headers=headers, json_serialize=ujson.dumps) as session:
            async with session.put(url, json=data) as response:
                if (response.status == 200) or (response.status == 201):
                    resp = await response.json()
                    return resp
                else:
                    return {"error_code": "HTTP_ERROR", "error_message": await response.text()}
        return {"error_code": "UNKNOWN_ERROR", "error_message": "unknown_error"}

    @staticmethod
    async def delete(url, params=None, headers={}):
        #resp = None
        headers["Content-Type"] = "application/json"
        async with aiohttp.ClientSession(headers=headers, json_serialize=ujson.dumps) as session:
            async with session.delete(url, params=params) as response:
                if (response.status == 200) or (response.status == 201):
                    resp = await response.json()
                    return resp
                else:
                    return {"error_code": "HTTP_ERROR", "error_message": await response.text()}
        return {"error_code": "UNKNOWN_ERROR", "error_message": ""}
