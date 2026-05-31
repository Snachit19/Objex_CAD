from flask import Blueprint, jsonify

from app.middleware.auth_middleware import login_required
from app.controller.project_controller import (
    create_new_project,
    get_user_projects,
    get_project_by_id
)


projects_bp = Blueprint("projects", __name__)


@projects_bp.route("/api/projects/status", methods=["GET"])
@login_required
def check_status():
    return jsonify({
        "success": True,
        "message": "Project API is active"
    }), 200


@projects_bp.route("/api/projects", methods=["GET"])
@login_required
def get_projects_route():
    return get_user_projects()


@projects_bp.route("/api/projects", methods=["POST"])
@login_required
def create_project_route():
    return create_new_project()


@projects_bp.route("/api/projects/create", methods=["POST"])
@login_required
def create_project_create_route():
    return create_new_project()


@projects_bp.route("/api/projects/<int:project_id>", methods=["GET"])
@login_required
def get_single_project_route(project_id):
    return get_project_by_id(project_id)