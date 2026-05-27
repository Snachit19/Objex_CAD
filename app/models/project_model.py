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
            json.dumps(project_data["design_data"]),
            project_data["created_at"],
            project_data["updated_at"]
        )
    )

    db.close()
    return project_id


def get_projects_by_user(email):
    db = Database()

    projects = db.fetch_all(
        "SELECT * FROM projects WHERE owner_email = %s ORDER BY created_at DESC",
        (email,)
    )

    db.close()
    return projects


def find_project_by_id(project_id):
    db = Database()

    project = db.fetch_one(
        "SELECT * FROM projects WHERE id = %s",
        (project_id,)
    )

    db.close()
    return project