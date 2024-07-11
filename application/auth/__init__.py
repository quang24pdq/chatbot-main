import uuid
import json
import binascii
from application.database import redis_db


# default duration (second): 1 day
def generate_expirable_token(payload, duration = 86400):
    token = binascii.hexlify(uuid.uuid4().bytes).decode()
    pipe = redis_db.pipeline()
    pipe.set(token, json.dumps(payload))

    if (duration > 0):
        pipe.expire(token, duration)
    pipe.execute()
    return token


def generate_redis_key(unique_key, payload):
    token = binascii.hexlify(str(unique_key).encode()).decode()
    print ('---------------------------------------------------------------')
    print ('unique_key ', unique_key, token)
    token = unique_key if unique_key is not None and unique_key != 'None' else generate_expirable_token(payload=payload)
    redis_db.set(token, json.dumps(payload))
    return token
