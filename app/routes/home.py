from flask import Blueprint

from app.controllers.home import HomeController
from app.middleware.auth_middleware import login_required


class HomeRoutes:
    """Class-style route registry for Jinja-rendered pages."""

    def __init__(self):
        self.bp = Blueprint("home", __name__)
        self.controller = HomeController()

    def register(self):
        self.bp.route("/")(self.controller.login_page)
        self.bp.route("/register")(self.controller.register_page)
        self.bp.route("/dashboard")(
            login_required(self.controller.dashboard_page)
        )
        self.bp.route("/projects")(
            login_required(self.controller.projects_page)
        )
        self.bp.route("/help")(
            login_required(self.controller.help_page)
        )
        self.bp.route("/settings")(
            login_required(self.controller.settings_page)
        )
        self.bp.route("/cad/<int:project_id>")(
            login_required(self.controller.cad_page)
        )
        return self.bp


home_bp = HomeRoutes().register()
