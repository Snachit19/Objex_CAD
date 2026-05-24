from flask import Blueprint, jsonify

projects_bp = Blueprint("projects", __name__)


@projects_bp.route("/api/projects/status", methods=["GET"])
def project_status():
    return jsonify({
        "success": True,
        "message": "Project routes are working"
    }), 200