from flask import Blueprint, render_template
from app.middleware.auth_middleware import login_required


home_bp = Blueprint("home", __name__)


@home_bp.route("/")
def login_page():
    return render_template("index.html")


@home_bp.route("/register")
def register_page():
    return render_template("register.html")


@home_bp.route("/dashboard")
@login_required
def dashboard_page():
    return render_template("dashboard.html")