from flask import Blueprint

from app.controllers.auth import AuthController


class AuthRoutes:
    """Class-style auth route registry like the reference Flask project."""

    def __init__(self):
        self.bp = Blueprint("auth", __name__)
        self.controller = AuthController()

    def register(self):
        self.bp.route("/api/register", methods=["POST"])(
            self.controller.register
        )
        self.bp.route("/api/login", methods=["POST"])(
            self.controller.login
        )
        self.bp.route("/api/logout", methods=["POST"])(
            self.controller.logout
        )
        self.bp.route("/api/me", methods=["GET"])(
            self.controller.me
        )
        self.bp.route("/api/me", methods=["PATCH"])(
            self.controller.update_profile
        )
        return self.bp


auth_bp = AuthRoutes().register()
