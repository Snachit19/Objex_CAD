from app.models.database import get_db_connection
import json


def create_project(project_data):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
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

    connection.commit()
    project_id = cursor.lastrowid

    cursor.close()
    connection.close()

    return project_id


def get_projects_by_user(email):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

<<<<<<< Updated upstream
    cursor.execute(
        "SELECT * FROM projects WHERE owner_email = %s ORDER BY created_at DESC",
=======
    projects = db.fetch_all(
        """
        SELECT id, name, description, owner_email, created_at, updated_at
        FROM projects
        WHERE owner_email = %s
        ORDER BY created_at DESC
        """,
>>>>>>> Stashed changes
        (email,)
    )

    projects = cursor.fetchall()

    cursor.close()
    connection.close()

    return projects


<<<<<<< Updated upstream
def find_project_by_id(project_id):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute(
        "SELECT * FROM projects WHERE id = %s",
        (project_id,)
    )

    project = cursor.fetchone()

    cursor.close()
    connection.close()
=======
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

    if project and project.get("design_data"):
        try:
            project["design_data"] = json.loads(project["design_data"])
        except Exception:
            project["design_data"] = []
>>>>>>> Stashed changes

    return project