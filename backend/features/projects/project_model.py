from backend.config.db import projects_collection


def create_project(project_data):
    return projects_collection.insert_one(project_data)


def get_projects_by_user(email):
    return list(projects_collection.find({"owner_email": email}))


def find_project_by_id(project_id):
    return projects_collection.find_one({"_id": project_id})