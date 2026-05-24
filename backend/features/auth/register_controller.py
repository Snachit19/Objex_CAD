from flask import request, jsonify
from werkzeug.security import generate_password_hash
from backend.features.auth.user_model import user_collection

def register():
    data     = request.get_json()
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"success": False, "message": "Email and password are required"}), 400

    if user_collection.find_one({"email": email}):
        return jsonify({"success": False, "message": "Account already exists"}), 409

    user_collection.insert_one({
        "email":    email,
        "password": generate_password_hash(password),
        "name":     data.get("name", "User"),
    })
    return jsonify({"success": True, "message": "Account created successfully"}), 201