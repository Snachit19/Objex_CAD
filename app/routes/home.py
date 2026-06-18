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


@home_bp.route("/projects")
@login_required
def projects_page():
    return render_template("projects.html")


@home_bp.route("/cad/<int:project_id>")
@login_required
def cad_page(project_id):
    return render_template("cad.html", project_id=project_id)