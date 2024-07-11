from datetime import datetime
from gatco.response import json
from gatco.exceptions import ServerError
from application.extensions import auth
from application.common.constants import ERROR_CODE, ERROR_MSG, STATUS_CODE
from application.config import Config
config = Config()

INTERNAL_ACCESS_TOKEN = '59zqK9DLrEdUbDFXMcfGKZXiNbFJeJ37IqlhqNQFhTnhnQ4XS7rqVeywd25hBWc7v390biIVk6h08fvyabNPNn7Q3YsxMu07nZWn5u8fod6njpJjqlW1yUHrGXMiiCft'
ACCESS_TOKEN = 'MhZBy93zMUa5UwpLB3G2qYxFNSAdZpvCwk1UhUhREfMmB1W0SsR8eeDRV1VKggaBo1jtLrbeuNqWDaKlsrkwuLefDXNH1O8dDiwfxxhP9vBCwaLOrT9JvbOWWstN4sQv'


async def auth_func(request=None, **kw):
    if config.APP_MODE == 'development':
        pass
    else:
        access_token = request.args.get('access_token') if request.args.get('access_token', None) is not None else request.headers.get('access-token')
        # print ("INTERNAL_ACCESS_TOKEN ", access_token)
        # print (access_token is not None and access_token == INTERNAL_ACCESS_TOKEN)
        if access_token is not None and access_token == INTERNAL_ACCESS_TOKEN:
            pass
        else:
            current_user = auth.current_user(request)
            if current_user is None:
                return json({
                    "error_code": ERROR_CODE['AUTH_ERROR'],
                    "error_message": ERROR_MSG['AUTH_ERROR']
                }, status=STATUS_CODE['AUTH_ERROR'])


def verify_access(request):
    if config.APP_MODE == 'development':
        pass
    else:
        currentUser = auth.current_user(request)
        if currentUser is None:
            return json({"error_code": ERROR_CODE['AUTH_ERROR'],"error_message": ERROR_MSG['AUTH_ERROR']}, status=STATUS_CODE['AUTH_ERROR'])


def verify_access_token(request, **kw):
    if config.APP_MODE == 'development':
        pass
    else:
        token = None
        try:
            token = request.headers.get('app-key') if request.headers.get('app-key') else request.headers.get('access_token')
            app_keys = config.get_app_access_token()
            flag = False
            for key in app_keys:
                if app_keys.get(key) == token:
                    flag =  True

            if flag == False and token == config.APP_KEY:
                flag = True
            
            if flag == False and auth_func(request) != True:
                return json({"error_code":ERROR_CODE['PERMISSION_ERROR'], "error_message":ERROR_MSG['PERMISSION_ERROR']}, status_code=520)
        except:
            return json({"error_code":ERROR_CODE['PERMISSION_ERROR'], "error_message":ERROR_MSG['PERMISSION_ERROR']}, status_code=520)




def pre_process_auth(request=None, **kw):
    if config.APP_MODE == 'development':
        pass
    else:
        access_token = request.args.get('access_token') if request.args.get('access_token', None) is not None else request.headers.get('access_token')
        if access_token is not None and access_token == INTERNAL_ACCESS_TOKEN:
            pass
        else:
            current_user = auth.current_user(request)
            if current_user is None:
                return json({
                    "error_code": ERROR_CODE['AUTH_ERROR'],
                    "error_message": ERROR_MSG['AUTH_ERROR']
                }, status=STATUS_CODE['AUTH_ERROR'])