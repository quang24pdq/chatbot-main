import time
from sqlalchemy import and_, or_
from gatco.response import json, text, html
from application.extensions import apimanager
from application.extensions import auth
from application.server import app
from gatco.exceptions import ServerError
from gatco_restapi import ProcessingException
from gatco_restapi.helpers import to_dict
from application.fblib.base import auth_func, verify_access_token
from application.database import motordb

if app.config.get("DEVELOPMENT_MODE", False) is not True:
    @auth.user_loader
    def user_loader(token):
        if token is not None:
            if 'exprire' in token:
                if token['exprire'] < time.time():
                    return None
                del(token["exprire"])
            return token
        return None
else:
    @app.route('/login', methods=['POST'])
    async def login(request):
        username = request.json.get("username", None)
        password = request.json.get("password", None)
        # user = db.session.query(User).filter(and_(or_(User.user_name == username, User.email == username), User.active == True)).first()
        user = motordb.db['user'].find({"user_name": username})
        if (user is not None) and auth.verify_password(password, user.user_password):
            auth.login_user(request, user)
            return json(get_user_with_permission(to_dict(user)))
        return json({"error_code": "LOGIN_FAILED", "error_message": "user does not exist or incorrect password"}, status=501)


def set_user_passwd(data=None, **kw):
    if ('user_password' in data) and ('confirm_password' in data):
        if(data['user_password'] == data['confirm_password']):
            data['user_password'] = auth.encrypt_password(
                data['user_password'])
            del data['confirm_password']
        else:
            raise ProcessingException(
                description='Confirm password is not match', code=520)
    else:
        raise ProcessingException(
            description='Parameters are not correct', code=520)


def reset_user_passwd(instance_id=None, data=None, **kw):
    if (data is not None) and ('user_password' in data) and ('confirm_password' in data):
        if (data['user_password'] is not None):
            if(data['user_password'] == data['confirm_password']):
                #user = user_datastore.find_user(id=instance_id)
                # if verify_password(data['password'], user.password):
                data['user_password'] = auth.encrypt_password(
                    data['user_password'])
                #del data['newpassword']
                del data['confirm_password']
                # else:
                #    raise ProcessingException(description='Password is not correct',code=401)
            else:
                raise ProcessingException(
                    description='Confirm password is not match', code=520)
        else:
            del data['confirm_password']
            del data['user_password']
    else:
        raise ProcessingException(
            description='Parameters are not correct', code=520)


apimanager.create_api(collection_name='user',
                      methods=['GET', 'POST', 'DELETE', 'PUT'],
                      url_prefix='/api/v1',
                      preprocess=dict(GET_SINGLE=[auth_func, verify_access_token],
                                      GET_MANY=[auth_func, verify_access_token],
                                      POST=[auth_func, verify_access_token,
                                            set_user_passwd],
                                      PUT_SINGLE=[auth_func, verify_access_token, reset_user_passwd]),
                      exclude_columns=['user_password'])


@app.route('/logout')
def logout(request):
    try:
        auth.logout_user(request)
    except:
        pass
    return json({})


def get_user_with_permission(user_info):
    # user = User.query.filter(or_(User.phone == user_info["phone"], User.email == user_info['email'])).first()
    user = motordb.db['user'].find({"email": user_info['email']})
    if app.config.get("DEVELOPMENT_MODE", False) is not True:
        if user is None:
            pass
    elif user is not None:
        user_info = to_dict(user)

    return user_info


# @app.route('/current_user')
# async def get_current_user(request):
#     #     tenant_id = request['session'].get('current_tenant', None)
#     #     print(tenant_id, "tenant_id")
#     currentUser = auth.current_user(request)
#     if currentUser is not None:
#         # find current_tenant_id
#         if 'group_id' in currentUser and currentUser['group_id'] is not None:
#             tenant_id = request['session'].get(
#                 currentUser['group_id']+'_current_tenant', None)

#             if tenant_id is not None:
#                 currentUser['current_tenant_id'] = tenant_id

#         user_info = get_user_with_permission(currentUser)
#         if user_info is not None:
#             return json(user_info)

#     return json({
#         "error_code": "USER_NOT_FOUND",
#         "error_message": "User does not exist"
#     }, status=520)
