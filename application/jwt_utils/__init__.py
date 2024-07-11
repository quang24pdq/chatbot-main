import jwt
from application.config import Config


def encode_jwt(payload):
  return jwt.encode(payload, Config.JWT_SIGNATURE, algorithm=Config.JWT_ALGORITHMS)


def decode_jwt(token):
  return jwt.decode(token, Config.JWT_SIGNATURE, algorithms=[Config.JWT_ALGORITHMS])

