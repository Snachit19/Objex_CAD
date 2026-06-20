from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os
from app.models.database import Database

from app.routes.home import HomeRoutes
from app.routes.auth import AuthRoutes
from app.routes.project import ProjectRoutes


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

    app.register_blueprint(HomeRoutes().register())
    app.register_blueprint(AuthRoutes().register())
    app.register_blueprint(ProjectRoutes().register())

    return app
