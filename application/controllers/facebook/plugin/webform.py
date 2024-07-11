from random import randint
from application.extensions import apimanager, jinja
from gatco.response import html, json
from bson.objectid import ObjectId
from application.database import motordb
from application.server import app
from application.common.helpers import now_timestamp
from application.controllers.base import auth_func
from application.controllers.tenant import set_tenant

from application.controllers.facebook.contact import update_contact
from application.controllers.facebook.message.messaging_session import update_session_detection


@app.route('/api/v1/webform/receive_webview_data', methods=['OPTIONS', 'POST'])
async def receive_webview_data(request):
    data = request.json

    pid = data.get('pid', None)

    contact = await motordb.db['contact'].find_one({"id": pid})

    return json({
        'ok': True
    }, status=200)




@app.route('/api/v1/webform/screen', methods=['OPTIONS', 'GET', 'POST'])
async def get_screen(request):
    webview_id = request.args.get("id", None)
    pid = request.args.get("pid", None)

    if webview_id is None:
        return json({
            "ok": False
        }, status=520)

    webview = await motordb.db['webview'].find_one({'_id': ObjectId(webview_id)})

    title = webview.get("title", "Powered by UPGO.vn")
    header = "<div class='card-header pt-4 pb-4 text-center'>" + \
        "<div class='w-75 m-auto'>" + \
            "<h4 class='text-center mt-0 font-weight-bold'>"+webview.get('title', 'Powered by UPGO.vn')+"</h4>" + \
        "</div>" + \
    "</div>"

    fields = webview.get("fields", [])

    field_html = ''
    for field in fields:

        if field.get("name", None) == "text":
            field_html += '<div class="row" id="'+field.get("_id", "")+'" style="padding: 10px 0px 0px 0px;">\
                <div class="col-lg-12 field_space" style="text-align: ' + (field['align'] if field.get("align", None) is not None else '') + '; color: ' + (field['color'] if field.get("color", None) is not None else '#bdbdbd') + '">\
                    <label>\
                        <span class="' + (field['style_class'] if field.get("style_class", None) is not None else '') + '">'+field.get("label", "")+'</span>\
                    </label>\
                </div>\
            </div>'
        elif field.get("name", None) == "input":
            field_html += '<div class="row" id="'+field.get("_id", "")+'">\
                <div class="col-lg-12 field_space" style="text-align: ' + (field['align'] if field.get("align", None) is not None else '') + ';">\
                    <input type="text" name="' + (field['attribute'] if field.get("attribute", None) is not None else "") + '" class="form-control ' + (field['style_class'] if field.get("style_class", None) is not None else '') + '" placeholder="'+(field['placeholder'] if field.get("placeholder", None) is not None else '')+'" style="color: ' + (field['color'] if field.get("color", None) is not None else '#333') + '"/>\
                </div>\
            </div>'
        elif field.get("name", None) == "textarea":
            field_html += '<div class="row" id="'+field.get("_id", "")+'">\
                <div class="col-lg-12 field_space">\
                    <textarea name="' + (field['attribute'] if field.get("attribute", None) is not None else "") + '" class="form-control ' + (field['style_class'] if field.get("style_class", None) is not None else '') + '" rows="' + (str(field['rows']) if field.get("rows", None) is not None else "2") + '" placeholder="' + (field['placeholder'] if field.get("placeholder", None) is not None else '') + '" style="color: ' + (field['color'] if field.get("color", None) is not None else 'auto') + ';"></textarea>\
                </div>\
            </div>'

    data = {
        "webview_title": title,
        "header": header,
        "body": field_html,
        "pid": pid
    }

    return jinja.render('webform.html', request, **data)



apimanager.create_api(collection_name='webview',
    methods=['GET', 'POST', 'DELETE', 'PUT'],
    url_prefix='/api/v1',
    preprocess=dict(
        GET_SINGLE=[auth_func],
        GET_MANY=[auth_func],
        POST=[auth_func, set_tenant],
        PUT_SINGLE=[auth_func]
    )
)
