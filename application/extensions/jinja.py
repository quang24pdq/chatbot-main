from gatco_jinja2 import GatcoJinja2

class Jinja(GatcoJinja2):
    def init_app(self, app, loader=None, pkg_name=None, pkg_path=None):
        super(Jinja, self).init_app(app, loader, pkg_name, pkg_path)

        self.add_env("fb_app_id", app.config.get("FB_APP_ID", ""))
        self.add_env("graph_version", app.config.get("FACEBOOK_GRAPH_VERSION", ""))
        self.add_env("host_url", app.config.get("HOST_URL", ""))
        self.add_env("static_url", app.config.get("STATIC_URL", ""))
        self.add_env("app_mode", app.config.get("APP_MODE", ""))
        self.add_env("app_version", app.config.get("APP_VERSION", ""))

