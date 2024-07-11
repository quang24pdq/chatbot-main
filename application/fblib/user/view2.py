import time
#from sqlalchemy import and_, or_
#from __future__ import division
from gatco.response import json, text, html
from application.extensions import apimanager
# from .model import User, Permission, Role
from application.extensions import auth
from application.database import motordb
from application.server import app
from gatco.exceptions import ServerError
from gatco_restapi import ProcessingException
from gatco_restapi.helpers import to_dict
db = motordb


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
        user = db.session.query(User).filter(and_(or_(
            User.user_name == username, User.email == username), User.active == True)).first()
        if (user is not None) and auth.verify_password(password, user.user_password):
            auth.login_user(request, user)
            return json(get_user_with_permission(to_dict(user)))
        return json({"error_code": "LOGIN_FAILED", "error_message": "user does not exist or incorrect password"}, status=501)


def current_user(request):
    uid = auth.current_user(request)
    if uid is not None:
        user = db.session.query(User).filter(
            and_(User.id == uid, User.active == True)).first()
        return user
    return None


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


def get_user_with_permission(user):
    user_info = to_dict(user)
    roles = [{"id": str(role.id), "display_name": role.display_name,
              "role_name": role.role_name} for role in user.roles]
    roleids = [role.id for role in user.roles]
    user_info["roles"] = roles
    del(user_info["user_password"])

    # permission:
    perms = Permission.query.filter(Permission.role_id.in_(
        roleids)).order_by(Permission.subject).all()
    permobj = {}

    for perm in perms:
        if perm.subject not in permobj:
            permobj[perm.subject] = {}

        if perm.permission not in permobj[perm.subject]:
            permobj[perm.subject][perm.permission] = perm.value
        elif not permobj[perm.subject][perm.permission]:
            permobj[perm.subject][perm.permission] = perm.value
    user_info["permission"] = permobj

    starttime = time.time()
    # division:
    workstations = None
    if user.has_role("Admin"):
        workstations = [to_dict(restaurant)
                        for restaurant in Workstation.query.all()]
    else:
        workstations = [to_dict(restaurant)
                        for restaurant in user.workstations]

    user_info["workstations"] = workstations
    print("get_user_with_permission", time.time() - starttime)
    return user_info

# @app.route('/login', methods=['POST'])
# async def login(request):
#     username = request.json.get("username", None)
#     password = request.json.get("password", None)
#     user = db.session.query(User).filter(and_(or_(User.user_name == username, User.email == username), User.active == True)).first()
#     if (user is not None) and auth.verify_password(password, user.user_password):
#         auth.login_user(request, user)
#         return json(get_user_with_permission(user))
#     return json({"error_code":"LOGIN_FAILED","error_message":"user does not exist or incorrect password"}, status=501)


@app.route('/login', methods=['POST'])
async def login(request):
    username = request.json.get("username", None)
    password = request.json.get("password", None)

    # user = await db.user.({'user_name': username, 'password': password})
    user = {'user_name': username, 'password': password}
    return json(user)


# @app.route('/current_user')
# async def get_current_user(request):
#     error_msg = None
#     currentUser = current_user(request)
#     if currentUser is not None:
#         user_info = get_user_with_permission(currentUser)
#         return json(user_info)
#     else:
#         error_msg = "User does not exist"
#     return json({
#         "error_code": "USER_NOT_FOUND",
#         "error_message": error_msg
#     }, status=520)
