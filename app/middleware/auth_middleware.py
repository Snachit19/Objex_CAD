from functools import wraps
from flask import session, redirect, request, jsonify


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_email" not in session:
            
            # For API requests, return JSON response
            if request.path.startswith("/api/"):
                return jsonify({
                    "success": False,
                    "message": "Login required"
                }), 401

            # For page requests, redirect to login page
            return redirect("/")

        return f(*args, **kwargs)

    return decorated