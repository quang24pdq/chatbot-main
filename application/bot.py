from pymessenger import Bot

class UpBot(Bot):
    previous_action = None
    data = {}
    def __init__(self, bot_id, access_token, **kw):
        super(UpBot, self).__init__(access_token, **kw)
        self.bot_id = bot_id