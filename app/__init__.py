from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os
from app.models.database import Database

from app.routes.home import home_bp
from app.routes.auth import auth_bp
from app.routes.project import projects_bp


def create_app():
    load_dotenv()

    app = Flask(
        __name__,
        template_folder="templates",
        static_folder="static"
    )

    CORS(app)

    app.secret_key = os.getenv("JWT_SECRET", "fallback-dev-key-change-this")

    Database.create_tables()

    app.register_blueprint(home_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(projects_bp)

    return app
