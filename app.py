from flask import Flask, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import os

from backend.features.auth.auth_routes import auth_bp
from backend.features.projects.project_routes import projects_bp
from backend.middleware.auth_middleware import login_required

load_dotenv()

app = Flask(__name__, static_folder="public")
CORS(app)

app.secret_key = os.getenv("JWT_SECRET", "fallback-dev-key-change-this")

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(projects_bp)


# Serve login page
@app.route("/")
def home():
    return send_from_directory("public", "index.html")


# Serve register page
@app.route("/register")
def register_page():
    return send_from_directory("public", "register.html")


# Serve dashboard page
@app.route("/dashboard")
@login_required
def dashboard():
    return send_from_directory("public", "dashboard.html")


# Serve static files
@app.route("/<path:path>")
def static_files(path):
    return send_from_directory("public", path)


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    app.run(debug=True, port=port)