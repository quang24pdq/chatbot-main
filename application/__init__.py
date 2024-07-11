import os
from .server import app

def run_app(host="127.0.0.1", port=10008, debug=False):
    """ Function for bootstrapping gatco app. """
    app.run(host=host, port=port, debug=debug, workers=2)