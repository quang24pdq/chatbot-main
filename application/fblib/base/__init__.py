from gatco.response import json
from gatco.exceptions import ServerError
from gatco_restapi import  ProcessingException
from application.extensions import auth
from application.common.constants import ERROR_CODE, ERROR_MSG
from application.config import Config
config = Config()


def auth_func(request=None, **kw):
    uid = auth.current_user(request)
#     if uid is None:
#         return False
#     return True


def verify_access_token(request, **kw):
    token = None
    try:
        token = request.headers.get('app-key') if request.headers.get('app-key') else request.headers.get('access_token')
        app_keys = config.get_app_access_token()
        flag = False
        for key in app_keys:
            if app_key.get(key) == token:
                flag =  True

        if flag == False and token == config.APP_KEY:
            flag = True
        
        if flag == False and auth_func(request) != True:
            raise ProcessingException(ERROR_MSG['PERMISSION_ERROR'], status_code=520)
    except:
        raise ProcessingException(ERROR_MSG['PERMISSION_ERROR'], status_code=520)