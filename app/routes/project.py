from flask import Blueprint, jsonify

from app.controllers.project import ProjectController
from app.middleware.auth_middleware import login_required


class ProjectRoutes:
    """Class-style route registry for project API routes."""

    def __init__(self):
        self.bp = Blueprint("projects", __name__)
        self.controller = ProjectController()

    def check_status(self):
        return jsonify({
            "success": True,
            "message": "Project API is active"
        }), 200

    def register(self):
        self.bp.route("/api/projects/status", methods=["GET"])(
            login_required(self.check_status)
        )
        self.bp.route("/api/projects", methods=["GET"])(
            login_required(self.controller.list)
        )
        self.bp.route("/api/projects", methods=["POST"], endpoint="create_project")(
            login_required(self.controller.create)
        )
        self.bp.route(
            "/api/projects/create",
            methods=["POST"],
            endpoint="create_project_alias"
        )(
            login_required(self.controller.create)
        )
        self.bp.route("/api/projects/import", methods=["POST"])(
            login_required(self.controller.import_design)
        )
        self.bp.route("/api/projects/<int:project_id>", methods=["GET"])(
            login_required(self.controller.detail)
        )
        self.bp.route("/api/projects/<int:project_id>", methods=["PATCH", "PUT"])(
            login_required(self.controller.rename)
        )
        self.bp.route("/api/projects/<int:project_id>", methods=["DELETE"])(
            login_required(self.controller.delete)
        )
        self.bp.route("/api/projects/<int:project_id>/save", methods=["POST", "PUT"])(
            login_required(self.controller.save_design)
        )
        return self.bp


projects_bp = ProjectRoutes().register()
