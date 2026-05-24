from flask import request, jsonify
from werkzeug.security import generate_password_hash
from datetime import datetime

from backend.features.auth.user_model import find_user_by_email, create_user


def register():
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