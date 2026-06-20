from flask import request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

from app.models.user import find_user_by_email, create_user, update_user_name
from app.middleware.auth_middleware import login_required
from app.controllers.base_controller import BaseController


class AuthController(BaseController):
    """OOP controller for registration, login, logout, and profile APIs."""

    def register(self):
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "message": "No data provided"
            }), 400

        name = data.get("name") or data.get("fullname") or "User"
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")

        if not email or not password:
            return jsonify({
                "success": False,
                "message": "Email and password are required"
            }), 400

        if len(password) < 6:
            return jsonify({
                "success": False,
                "message": "Password must be at least 6 characters"
            }), 400

        existing_user = find_user_by_email(email)

        if existing_user:
            return jsonify({
                "success": False,
                "message": "Account already exists"
            }), 409

        hashed_password = generate_password_hash(password)

        user_data = {
            "name": name,
            "email": email,
            "password": hashed_password,
            "created_at": datetime.utcnow()
        }

        create_user(user_data)

        return jsonify({
            "success": True,
            "message": "Account created successfully"
        }), 201

    def login(self):
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "message": "No data provided"
            }), 400

        email = data.get("email", "").strip().lower()
        password = data.get("password", "")

        if not email or not password:
            return jsonify({
                "success": False,
                "message": "Email and password are required"
            }), 400

        user = find_user_by_email(email)

        if not user or not check_password_hash(user["password"], password):
            return jsonify({
                "success": False,
                "message": "Invalid email or password"
            }), 401

        session["user_email"] = user["email"]
        session["user_name"] = user.get("name", "User")

        return jsonify({
            "success": True,
            "message": "Logged in successfully",
            "name": user.get("name", "User"),
            "email": user["email"]
        }), 200

    def logout(self):
        session.clear()

        return jsonify({
            "success": True,
            "message": "Logged out successfully"
        }), 200

    @login_required
    def me(self):
        return jsonify({
            "success": True,
            "email": session.get("user_email"),
            "name": session.get("user_name")
        }), 200

    @login_required
    def update_profile(self):
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "message": "No data provided"
            }), 400

        name = data.get("name", "").strip()
        email = session.get("user_email")

        if not email:
            return jsonify({
                "success": False,
                "message": "Session expired"
            }), 401

        if not name:
            return jsonify({
                "success": False,
                "message": "Name is required"
            }), 400

        if len(name) > 100:
            return jsonify({
                "success": False,
                "message": "Name must be 100 characters or less"
            }), 400

        update_user_name(email, name)
        session["user_name"] = name

        return jsonify({
            "success": True,
            "message": "Name updated successfully",
            "name": name,
            "email": email
        }), 200


def register():
    return AuthController().register()


def login():
    return AuthController().login()


def logout():
    return AuthController().logout()


def me():
    return AuthController().me()


def update_profile():
    return AuthController().update_profile()
