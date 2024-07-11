from application.extensions import jinja
from gatco.response import json
from application.controllers.facebook import init_facebook

def init_controllers(app):
#     import application.controllers.base
    import application.controllers.facebook
    import application.controllers.rocketchat
    import application.controllers.tenant
    import application.controllers.user
    import application.controllers.statistic

    import application.controllers.integration.upstart_crm
    import application.controllers.integration.upstart_wifi
    import application.controllers.integration.upstart_booking
    import application.controllers.integration.upstart_instantpage

    init_facebook()

    # WIT AI
    import application.witai.base_api
    import application.witai.chatbot_api

    @app.route('/')
    def index(request):
        # return jinja.render_string('Hello {{name}}', request, {"name": "CuongNC"})
        return jinja.render('index.html', request)
