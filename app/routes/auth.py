from flask import Blueprint
from app.controllers.auth import register, login, logout, me


auth_bp = Blueprint("auth", __name__)


auth_bp.route("/api/register", methods=["POST"])(register)
auth_bp.route("/api/login", methods=["POST"])(login)
auth_bp.route("/api/logout", methods=["POST"])(logout)
auth_bp.route("/api/me", methods=["GET"])(me)
