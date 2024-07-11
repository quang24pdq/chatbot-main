import time
import requests
import json as json_load
from application.server import app


async def send_mail(recipient, subject, mail_content):
    service_url = app.config.get('MAIL_SERVICE_URL')
    if subject is None:
        subject = app.config.get("MAIL_DEFAULT_SUBJECT")
    payload = {
        "to": recipient,
        "subject": subject,
        "message": mail_content
    }
    headers = {
        "Content-Type": "application/json"
    }

    result = requests.post(service_url, data=json_load.dumps(payload), headers=headers)

