from flask import Flask, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import os

from backend.features.auth.auth_routes import auth_bp
from backend.features.projects.project_routes import projects_bp

load_dotenv()

app = Flask(__name__, static_folder="public")
CORS(app)

app.secret_key = os.getenv("SECRET_KEY", "fallback-dev-key-change-this")

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(projects_bp)

# Serve pages
@app.route("/")
def home():
    return send_from_directory("public", "index.html")

@app.route("/dashboard")
def dashboard():
    from backend.middleware.auth_middleware import login_required
    return send_from_directory("public", "dashboard.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory("public", path)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(debug=True, port=port)