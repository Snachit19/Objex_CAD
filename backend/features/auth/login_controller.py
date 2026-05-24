from flask import request, jsonify, session
from werkzeug.security import check_password_hash
from backend.features.auth.user_model import user_collection
from backend.middleware.auth_middleware import login_required

def login():
    data     = request.get_json()
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")

    user = user_collection.find_one({"email": email})

    if not user or not check_password_hash(user["password"], password):
        return jsonify({"success": False, "message": "Invalid email or password"}), 401

    session["user_email"] = email
    session["user_name"]  = user.get("name", "User")

    return jsonify({"success": True, "message": "Logged in successfully", "name": user.get("name", "User")}), 200

def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully"}), 200

@login_required
def me():
    return jsonify({
        "success": True,
        "email": session.get("user_email"),
        "name":  session.get("user_name"),
    }), 200