from flask import request, jsonify, session
from datetime import datetime

from backend.features.projects.project_model import create_project, get_projects_by_user


def create_new_project():
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

    user_email = session.get("user_email")

    project_data = {
        "name": project_name,
        "description": description,
        "owner_email": user_email,
        "design_data": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    result = create_project(project_data)

    return jsonify({
        "success": True,
        "message": "Project created successfully",
        "project": {
            "id": str(result.inserted_id),
            "name": project_name,
            "description": description
        }
    }), 201


def get_user_projects():
    user_email = session.get("user_email")

    projects = get_projects_by_user(user_email)

    project_list = []

    for project in projects:
        project_list.append({
            "id": str(project["_id"]),
            "name": project.get("name", "Untitled Project"),
            "description": project.get("description", ""),
            "created_at": str(project.get("created_at", ""))
        })

    return jsonify({
        "success": True,
        "projects": project_list
    }), 200