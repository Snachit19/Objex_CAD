from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

from app.routes.home_route import home_bp
from app.routes.auth_route import auth_bp
from app.routes.project_route import projects_bp


def create_app():
    load_dotenv()

    app = Flask(
        __name__,
        template_folder="templates",
        static_folder="static"
    )

    CORS(app)

    app.secret_key = os.getenv("JWT_SECRET", "fallback-dev-key-change-this")

    app.register_blueprint(home_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(projects_bp)

    return app