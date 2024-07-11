from .useragent import GatcoUserAgent
from gatco_auth import Auth
from .jinja import Jinja
from application.database import motordb
from gatco_apimanager import APIManager
from gatco_apimanager.views.motor import APIView
from sanic_cors import CORS, cross_origin


#from motor_restapi import APIManager



auth = Auth()
apimanager = APIManager("motor_restapi")
jinja = Jinja()


def init_extensions(app):
    cors = CORS(app, automatic_options=True)
    GatcoUserAgent.init_app(app)
    auth.init_app(app)
    apimanager.init_app(app, view_cls=APIView, db=motordb)
    jinja.init_app(app)