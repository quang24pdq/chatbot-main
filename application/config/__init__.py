import os

class Config(object):
    APP_MODE = os.getenv('ENVIRONMENT') # production, staging, development
    APP_VERSION = "1.7.2"
    MOTOR_URI = 'mongodb://%s:27017/%s' % (os.getenv('BOT_MONGO_ADDR'), os.getenv('BOT_MONGO_DBNAME'))
    MOTOR_LOG_URI = 'mongodb://%s:27017/%s' % (os.getenv('BOT_MONGO_ADDR'), os.getenv('BOT_LOG_DBNAME'))

    HOST_URL = "https://bot.upgo.vn"
    STATIC_URL = "https://static.upgo.vn/bot/" + APP_VERSION

    UPGO_CRM_URL = 'https://crm.upgo.vn'
    UPGO_ACCOUNT_URL = 'https://account.upgo.vn'
    UPGO_WIFI_URL = 'https://wifi.upgo.vn'
    UPGO_COMMON_SERVICE_URL = 'https://service.upgo.vn'
    UPGO_AIRFLOW_LOCAL_URL = 'http://192.168.80.154:8080'
    UPGO_AIRFLOW_URL = 'https://airflow.upgo.vn'

    FB_APP_ID = '1954631488180264'
    FB_APP_SECRET_KEY = 'cf35a095e2382c9c4c5a3d926d80c33c'

    REQUEST_TIMEOUT = 8400
    RESPONSE_TIMEOUT = 8400
    AUTH_LOGIN_ENDPOINT = 'login'
    AUTH_PASSWORD_HASH = 'sha512_crypt'
    AUTH_PASSWORD_SALT = 'add_salt'
    SECRET_KEY = os.getenv('AUTH_SECRET_KEY')
    SESSION_COOKIE_SALT = 'salt_key'
    SESSION_COOKIE_DOMAIN = '.upgo.vn'

    JWT_ALGORITHMS='HS256'
    JWT_SIGNATURE = os.getenv('JWT_SIGNATURE', None)

    SESSION_REDIS_ADDR = os.getenv('REDIS_ADDRESS_URI')
    SESSION_REDIS_PORT = 6379
    SESSION_REDIS_DB = os.getenv('SESSION_REDIS_DB')
    SESSION_REDIS_URI = "redis://" + \
        str(SESSION_REDIS_ADDR)+":" + \
        str(SESSION_REDIS_PORT)+"/"+str(SESSION_REDIS_DB)

    QUEUE_REDIS_ADDR = os.getenv('REDIS_ADDRESS_URI')
    QUEUE_REDIS_PORT = 6379
    QUEUE_REDIS_DB = os.getenv('QUEUE_REDIS_DB')
    QUEUE_REDIS_URI = "redis://" + \
        str(QUEUE_REDIS_ADDR)+":" + \
        str(QUEUE_REDIS_PORT)+"/"+str(QUEUE_REDIS_DB)

    WS_REDIS_ADDR = os.getenv('REDIS_ADDRESS_URI')
    WS_REDIS_PORT = 6379
    WS_REDIS_DB = os.getenv('WS_REDIS_ADDR')
    WS_REDIS_URI = "redis://" + \
        str(WS_REDIS_ADDR)+":" + \
        str(WS_REDIS_PORT)+"/"+str(WS_REDIS_DB)

    APP_KEY = 'WGNXU9T3QK9EZAPYUWS76RSMP27AB6CX'
    ACCESS_TOKENS = {
        'upcrm': 'V24O499XM10397S42AQA0B1NLXYENLFO',
        'meeup': 'V24O499XM10397S42AQA0B1NLXYENLFO'
    }

    FACEBOOK_API_VERSION = 12.0
    FACEBOOK_GRAPH_VERSION = 'v12.0'
    FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/'+FACEBOOK_GRAPH_VERSION+'/'

    HOST_EMAIL = "upstartvn@gmail.com"
    MAIL_SERVICE_URL = "https://service.upgo.vn/api/email/send"
    MAIL_SERVER_USE_TLS = False
    MAIL_SERVER_USE_SSL = True
    MAIL_DEFAULT_SUBJECT = "UPGO.vn"
    WORKER_TIME_SLEEP = 5

    FILE_STORE_PATH = '/var/www/static/bot/file/'

    def get_app_access_token(self):
        return self.ACCESS_TOKENS

    def __init__(self):
        print ('Running environment:', os.getenv('ENVIRONMENT'))
