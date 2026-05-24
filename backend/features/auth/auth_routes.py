from flask import Blueprint
from backend.features.auth.register_controller import register
from backend.features.auth.login_controller import login, logout, me
from backend.middleware.auth_middleware import login_required

auth_bp = Blueprint("auth", __name__)

auth_bp.route("/api/register", methods=["POST"])(register)
auth_bp.route("/api/login",    methods=["POST"])(login)
auth_bp.route("/api/logout",   methods=["POST"])(logout)
auth_bp.route("/api/me",       methods=["GET"])(login_required(me))