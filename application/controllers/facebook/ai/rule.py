import ujson
import os, time, aiofiles
import random, string
import pandas as pd
from bson.objectid import ObjectId
from gatco.response import json, text
from application.database import motordb
from application.extensions import apimanager
from application.controllers.base import auth_func
from application.server import app
from application.common.helpers import now_timestamp
from application.controllers.tenant import set_tenant, get_current_tenant_id
from application.controllers.user import get_current_user

apimanager.create_api(collection_name='rule',
    methods=['GET', 'POST', 'DELETE', 'PUT'],
    url_prefix='/api/v1',
    preprocess=dict(
        GET_SINGLE=[auth_func],
        GET_MANY=[auth_func],
        POST=[auth_func, set_tenant],
        PUT_SINGLE=[auth_func]
    )
)


@app.route("/api/v1/rules")
async def get_all_rules(request):
    current_tenant = get_current_user(request)
    tenant_id = get_current_tenant_id(request)
    q = request.args.get("q")

    if q is not None:
        q = ujson.loads(q)

    selector = q.get("filters") if q.get("filters", None) is not None else {}
    selector['tenant_id'] = tenant_id

    query_cursor = motordb.db['rule'].find(selector).limit(1000)
    results = []
    async for r in query_cursor:
        r['_id'] = str(r['_id'])
        results.append(r)

    return json({
        "num_results": 1000,
        "page": 1,
        "next_page": None,
        "total_pages": 1,
        "objects": results
    })



@app.route('/api/v1/import/ai_rule', methods=['POST'])
async def import_ai_rule(request):
    current_tenant = get_current_user(request)
    tenant_id = get_current_tenant_id(request)

    bot_id = request.args.get("bot_id", None)
    if tenant_id is None or bot_id is None:
        return json({
            "error_code": "INVALID_REQUEST",
            "error_message": "Upload Failed"
        }, status=520)

    path = request.args.get("path", None)
    fsroot = app.config.get('FILE_STORE_PATH')

    if request.method == 'POST':
        file = request.files.get('file', None)
        if file:
            rand = ''.join(random.choice(string.digits) for _ in range(11))
            file_name = os.path.splitext(file.name)[0]
            extname = os.path.splitext(file.name)[1]
            newfilename = rand + str(round(time.time() * 1000)) + extname
            # newfilename = 'template_import_contact'+ extname

            if not os.path.exists(fsroot):
                os.makedirs(fsroot)
            
            subPath = ""
            
            if path is not None:
                subPath = path + "/"
                if not os.path.exists(fsroot + subPath):
                    os.makedirs(fsroot + subPath)

            async with aiofiles.open(fsroot + subPath + newfilename, 'wb+') as f:
                await f.write(file.body)
            link = fsroot + subPath + newfilename
            # ret = {
            #     "link": fsroot + subPath + newfilename
            # }

            df = pd.read_excel(link, sheet_name=0)
            lend = len(df)
            if lend > 0:
                is_new = True
                answer = None
                questions = []
                for i in range(0, lend):
                    row = df.loc[i]
                    no = row[0]
                    ans = row[1]
                    ques = row[2]

                    if ans is None or str(ans).strip() == "" or str(ans).strip().lower() == "nan":
                        is_new = False
                    else:
                        is_new = True

                    if is_new == True:
                        # SAVE PREVIOUS
                        await motordb.db['rule'].insert_one({
                            "active": True,
                            "block": None,
                            "bot_id": bot_id,
                            "created_at": now_timestamp(),
                            "entity": None,
                            "intent": "do_not_use",
                            "reply_text": str(answer),
                            "text": questions,
                            "type": "text",
                            "tenant_id": tenant_id
                        })

                        answer = ans
                        questions = [str(ques)]
                    else:
                        questions.append(str(ques))

                # INSERT LAST
                await motordb.db['rule'].insert_one({
                    "active": True,
                    "block": None,
                    "bot_id": bot_id,
                    "created_at": now_timestamp(),
                    "entity": None,
                    "intent": "do_not_use",
                    "reply_text": str(answer),
                    "text": questions,
                    "type": "text",
                    "tenant_id": tenant_id
                })

    return json({
        "message": "success"
    })



@app.route("/api/v1/delete_rules")
async def delete_rules(request):
    current_tenant = get_current_user(request)
    tenant_id = get_current_tenant_id(request)
    bot_id = request.args.get("bot_id")
    await motordb.db['rule'].delete_many({'bot_id': bot_id, 'tenant_id': tenant_id})
    return json({})