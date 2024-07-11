import json
import requests
import time, string, random
from application.config import Config
config = Config()

template_root = "/opt/deploy/UpgoBOT/repo/application/extensions/templates"
if config.APP_MODE == 'development':
    # template_root = "/opt/deploy/UpBOT/repo/application/extensions/templates"
    template_root = "/home/toan/Documents/workspace/UpBOT/repo/application/extensions/templates"


def read_template(template_name):
    data = None
    if template_name is not None:
        with open(template_root+'/' + template_name, 'r') as f:
            # data = json.load(f)
            data = f.read()
    else:
        with open(template_root+'/default-template.json', 'r') as f:
            # data = json.load(f)
            data = f.read()

    return data


def download_file(file_url, path=None):
    rand = ''.join(random.choice(string.digits) for _ in range(11))

    new_file_name = rand + str(round(time.time() * 1000)) + ".jpg"
    file_path = "/var/www/static/images/" + new_file_name
    if path is not None:
        file_path = path + "/" + new_file_name
    with open(file_path, 'wb') as f:
        f.write(requests.get(file_url).content)

    result = "https://static.upgo.vn/images/" + new_file_name

    return result