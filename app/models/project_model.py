from app.models.database import Database
import json


def create_project(project_data):
    db = Database()

    project_id = db.execute(
        """
        INSERT INTO projects 
        (name, description, owner_email, design_data, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (
            project_data["name"],
            project_data["description"],
            project_data["owner_email"],
            json.dumps(project_data.get("design_data", [])),
            project_data["created_at"],
            project_data["updated_at"]
        )
    )

    db.close()
    return project_id


def get_projects_by_user(email):
    db = Database()

    projects = db.fetch_all(
        """
        SELECT id, name, description, owner_email, created_at, updated_at
        FROM projects
        WHERE owner_email = %s
        ORDER BY created_at DESC
        """,
        (email,)
    )

    db.close()
    return projects


def find_project_by_id(project_id, owner_email):
    db = Database()

    project = db.fetch_one(
        """
        SELECT id, name, description, owner_email, design_data, created_at, updated_at
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