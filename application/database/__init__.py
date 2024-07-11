#!/usr/bin/env python
# -*- coding: utf-8 -*-
import redis
from gatco_motor import Motor
from application.server import app

motordb = Motor()
logdb = Motor()

redis_db = redis.StrictRedis(
    host=app.config.get('SESSION_REDIS_ADDR'),\
    port=app.config.get('SESSION_REDIS_PORT'),\
    db=app.config.get('SESSION_REDIS_DB')
)

def init_database(app):
    motordb.init_app(app)
    logdb.init_app(app, uri=app.config.get('MOTOR_LOG_URI'))
