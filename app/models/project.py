from app.models.database import Database
from app.models.base_model import BaseModel
import json


def create_project(project_data):
    db = Database()

    project_id = db.execute(
        """
        INSERT INTO projects 
        (name, description, owner_email, design_data, created_at, last_opened_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (
            project_data["name"],
            project_data["description"],
            project_data["owner_email"],
            json.dumps(project_data.get("design_data", [])),
            project_data["created_at"],
            project_data.get("last_opened_at", project_data["created_at"]),
            project_data["updated_at"]
        )
    )

    db.close()
    return project_id


def get_projects_by_user(email):
    db = Database()

    projects = db.fetch_all(
        """
        SELECT id, name, description, owner_email, created_at, last_opened_at, updated_at
        FROM projects
        WHERE owner_email = %s
        ORDER BY COALESCE(last_opened_at, updated_at, created_at) DESC
        """,
        (email,)
    )

    db.close()
    return projects


def find_project_by_id(project_id, owner_email):
    db = Database()

    project = db.fetch_one(
        """
        SELECT id, name, description, owner_email, design_data, created_at, last_opened_at, updated_at
        FROM projects
        WHERE id = %s AND owner_email = %s
        """,
        (project_id, owner_email)
    )

    db.close()

    if not project:
        return None

    if project.get("design_data"):
        try:
            project["design_data"] = json.loads(project["design_data"])
        except Exception:
            project["design_data"] = []
    else:
        project["design_data"] = []

    return project

def mark_project_opened(project_id, owner_email):
    db = Database()

    db.execute(
        """
        UPDATE projects
        SET last_opened_at = NOW(),
            updated_at = updated_at
        WHERE id = %s AND owner_email = %s
        """,
        (
            project_id,
            owner_email
        )
    )

    db.close()
    return True

def update_project_design(project_id, owner_email, design_data):
    db = Database()

    db.execute(
        """
        UPDATE projects
        SET design_data = %s,
            updated_at = NOW()
        WHERE id = %s AND owner_email = %s
        """,
        (
            json.dumps(design_data),
            project_id,
            owner_email
        )
    )

    db.close()
    return True


def update_project_details(project_id, owner_email, name, description=None):
    db = Database()

    if description is None:
        db.execute(
            """
            UPDATE projects
            SET name = %s,
                updated_at = NOW()
            WHERE id = %s AND owner_email = %s
            """,
            (
                name,
                project_id,
                owner_email
            )
        )
    else:
        db.execute(
            """
            UPDATE projects
            SET name = %s,
                description = %s,
                updated_at = NOW()
            WHERE id = %s AND owner_email = %s
            """,
            (
                name,
                description,
                project_id,
                owner_email
            )
        )

    db.close()
    return True


def delete_project_by_id(project_id, owner_email):
    db = Database()

    db.execute(
        """
        DELETE FROM projects
        WHERE id = %s AND owner_email = %s
        """,
        (
            project_id,
            owner_email
        )
    )

    db.close()
    return True


class Project(BaseModel):
    """Project model class for the MVC/OOP project structure."""

    @property
    def table(self):
        return "projects"

    def create(self, project_data):
        return create_project(project_data)

    def find_for_owner(self, project_id, owner_email):
        return find_project_by_id(project_id, owner_email)

    def list_for_owner(self, owner_email):
        return get_projects_by_user(owner_email)

    def save_design(self, project_id, owner_email, design_data):
        return update_project_design(project_id, owner_email, design_data)
