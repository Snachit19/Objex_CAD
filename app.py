from flask import Flask, send_from_directory, request, jsonify, session, redirect
from functools import wraps
from flask_cors import CORS
from dotenv import load_dotenv
import os
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash

load_dotenv()

app = Flask(__name__, static_folder="public")
CORS(app)

# Secret key for session cookies
app.secret_key = os.getenv("SECRET_KEY", "fallback-dev-key-change-this")

# MongoDB connection
client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017/"))
db = client[os.getenv("DB_NAME", "objex_cad")]
user_collection = db["users"]

# Auth decorator
# Protects routes — redirects to login if user is not logged in
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_email" not in session:
            return redirect("/")
        return f(*args, **kwargs)
    return decorated

# Serve pages
@app.route("/")
def home():
    return send_from_directory("public", "index.html")

@app.route("/dashboard")
@login_required
def dashboard():
    return send_from_directory("public", "dashboard.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory("public", path)

# API: Register
@app.route("/api/register", methods=["POST"])
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
        "password": generate_password_hash(password),  # ✅ comma fixed
        "name":     data.get("name", "User"),
    })
    return jsonify({"success": True, "message": "Account created successfully"}), 201

# API: Login
@app.route("/api/login", methods=["POST"])
def login():
    data     = request.get_json()                      # ✅ () fixed
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")

    user = user_collection.find_one({"email": email})

    if not user or not check_password_hash(user["password"], password):
        return jsonify({"success": False, "message": "Invalid email or password"}), 401

    session["user_email"] = email
    session["user_name"]  = user.get("name", "User")

    return jsonify({"success": True, "message": "Logged in successfully", "name": user.get("name", "User")}), 200

# API: Logout
@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully"}), 200

# API: Get current user
@app.route("/api/me", methods=["GET"])
@login_required
def me():
    return jsonify({
        "success": True,
        "email": session.get("user_email"),
        "name":  session.get("user_name"),
    }), 200

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(debug=True, port=port)
