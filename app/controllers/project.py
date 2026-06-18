from flask import request, jsonify, session
from datetime import datetime

from app.models.project import (
    create_project,
    get_projects_by_user,
    find_project_by_id,
    mark_project_opened,
    update_project_design
)

def create_new_project():
    user_email = session.get("user_email")

    if not user_email:
        return jsonify({
            "success": False,
            "message": "User not logged in"
        }), 401

    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "No data provided"
        }), 400

    name = data.get("name", "").strip()
    description = data.get("description", "").strip()

    if not name:
        return jsonify({
            "success": False,
            "message": "Project name is required"
        }), 400

    project_data = {
        "name": name,
        "description": description,
        "owner_email": user_email,
        "design_data": [],
        "created_at": datetime.utcnow(),
        "last_opened_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    project_id = create_project(project_data)

    return jsonify({
        "success": True,
        "message": "Project created successfully",
        "project": {
            "id": project_id,
            "name": name,
            "description": description
        }
    }), 201


def get_user_projects():
    user_email = session.get("user_email")

    if not user_email:
        return jsonify({
            "success": False,
            "message": "User not logged in"
        }), 401

    projects = get_projects_by_user(user_email)

    return jsonify({
        "success": True,
        "projects": projects
    }), 200


def get_project_by_id(project_id):
    user_email = session.get("user_email")

    if not user_email:
        return jsonify({
            "success": False,
            "message": "User not logged in"
        }), 401

    project = find_project_by_id(project_id, user_email)

    if not project:
        return jsonify({
            "success": False,
            "message": "Project not found"
        }), 404

    mark_project_opened(project_id, user_email)

    return jsonify({
        "success": True,
        "project": project
    }), 200

def save_project_design(project_id):
    user_email = session.get("user_email")

    if not user_email:
        return jsonify({
            "success": False,
            "message": "User not logged in"
        }), 401

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "message": "No design data provided"
        }), 400

    design_data = data.get("design_data")

    if design_data is None:
        return jsonify({
            "success": False,
            "message": "design_data field is required"
        }), 400

    if not isinstance(design_data, list):
        return jsonify({
            "success": False,
            "message": "design_data must be a list of CAD objects"
        }), 400

    project = find_project_by_id(project_id, user_email)

    if not project:
        return jsonify({
            "success": False,
            "message": "Project not found or access denied"
        }), 404

    update_project_design(project_id, user_email, design_data)

    return jsonify({
        "success": True,
        "message": "Design saved successfully",
        "object_count": len(design_data)
    }), 200


SUPPORTED_IMPORT_TYPES = {
    "cube", "sphere", "cylinder", "cone", "torus", "pyramid", "plane", "imported"
}


def validate_import_design_data(design_data):
    if not isinstance(design_data, list):
        return False, "design_data must be a list of CAD objects"

    for index, item in enumerate(design_data):
        if not isinstance(item, dict):
            return False, "Object at index {} is not a valid object".format(index)

        object_type = str(item.get("type", "")).strip().lower()

        if not object_type:
            return False, "Object at index {} is missing a type".format(index)

        if object_type not in SUPPORTED_IMPORT_TYPES:
            return False, "Object at index {} has unsupported type".format(index)

    return True, ""


def import_project():
    user_email = session.get("user_email")

    if not user_email:
        return jsonify({
            "success": False,
            "message": "User not logged in"
        }), 401

    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "No data provided"
        }), 400

    name = data.get("name", "").strip()
    description = data.get("description", "").strip()
    design_data = data.get("design_data", [])

    if not name:
        return jsonify({
            "success": False,
            "message": "Project name is required"
        }), 400

    is_valid, validation_message = validate_import_design_data(design_data)

    if not is_valid:
        return jsonify({
            "success": False,
            "message": validation_message
        }), 400

    project_data = {
        "name": name,
        "description": description,
        "owner_email": user_email,
        "design_data": design_data,
        "created_at": datetime.utcnow(),
        "last_opened_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    project_id = create_project(project_data)

    return jsonify({
        "success": True,
        "message": "Project imported successfully",
        "project": {
            "id": project_id,
            "name": name,
            "description": description,
            "object_count": len(design_data)
        }
    }), 201
