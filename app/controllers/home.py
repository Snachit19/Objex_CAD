from flask import render_template

from app.controllers.base_controller import BaseController


class HomeController(BaseController):
    """Controller for normal Jinja-rendered page routes."""

    def login_page(self):
        return render_template("index.html")

    def register_page(self):
        return render_template("register.html")

    def dashboard_page(self):
        return render_template("dashboard.html")

    def projects_page(self):
        return render_template("projects.html")

    def help_page(self):
        return render_template("help.html")

    def settings_page(self):
        return render_template("settings.html")

    def cad_page(self, project_id):
        return render_template("cad.html", project_id=project_id)
