from flask import Blueprint, jsonify

from app.middleware.auth_middleware import login_required
from app.controllers.project import (
    create_new_project,
    get_user_projects,
    get_project_by_id,
    save_project_design,
    import_project,
    rename_project,
    delete_project
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


@projects_bp.route("/api/projects/import", methods=["POST"])
@login_required
def import_project_route():
    return import_project()


@projects_bp.route("/api/projects/<int:project_id>", methods=["GET"])
@login_required
def get_single_project_route(project_id):
    return get_project_by_id(project_id)


@projects_bp.route("/api/projects/<int:project_id>", methods=["PATCH", "PUT"])
@login_required
def rename_project_route(project_id):
    return rename_project(project_id)


@projects_bp.route("/api/projects/<int:project_id>", methods=["DELETE"])
@login_required
def delete_project_route(project_id):
    return delete_project(project_id)

@projects_bp.route("/api/projects/<int:project_id>/save", methods=["POST", "PUT"])
@login_required
def save_project_design_route(project_id):
    return save_project_design(project_id)
