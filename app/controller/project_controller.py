from flask import request, jsonify, session
from datetime import datetime

from app.models.project_model import (
    create_project,
    get_projects_by_user,
    find_project_by_id
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

    project_name = data.get("name", "").strip()
    description = data.get("description", "").strip()

    if not project_name:
        return jsonify({
            "success": False,
            "message": "Project name is required"
        }), 400

    project_data = {
        "name": project_name,
        "description": description,
        "owner_email": user_email,
        "design_data": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    project_id = create_project(project_data)

    return jsonify({
        "success": True,
        "message": "Project created successfully",
        "project": {
            "id": project_id,
            "name": project_name,
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

    return jsonify({
        "success": True,
        "project": project
    }), 200