from flask import Blueprint, jsonify

from backend.middleware.auth_middleware import login_required
from backend.features.projects.create_project_controller import create_new_project, get_user_projects


projects_bp = Blueprint("projects", __name__)


@projects_bp.route("/api/projects/status", methods=["GET"])
def project_status():
    return jsonify({
        "success": True,
        "message": "Project routes are working"
    }), 200


@projects_bp.route("/api/projects/create", methods=["POST"])
@login_required
def create_project_route():
    return create_new_project()


@projects_bp.route("/api/projects", methods=["GET"])
@login_required
def get_projects_route():
    return get_user_projects()
