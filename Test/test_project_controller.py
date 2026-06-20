import unittest
from unittest.mock import patch

from flask import Flask, session

from app.controllers import project


def make_test_app():
    app = Flask(__name__)
    app.secret_key = "test-secret-key"
    return app


class TestProjectController(unittest.TestCase):
    def setUp(self):
        self.app = make_test_app()

    def test_create_project_requires_login(self):
        """Creating a project requires a logged-in user."""
        with self.app.test_request_context("/api/projects", method="POST", json={}):
            response, status_code = project.create_new_project()

        self.assertEqual(status_code, 401)
        self.assertFalse(response.get_json()["success"])

    def test_create_project_requires_name(self):
        """A project cannot be created without a name."""
        with self.app.test_request_context(
            "/api/projects",
            method="POST",
            json={"name": " ", "description": "Draft"},
        ):
            session["user_email"] = "student@example.com"

            response, status_code = project.create_new_project()

        self.assertEqual(status_code, 400)
        self.assertEqual(response.get_json()["message"], "Project name is required")

    @patch("app.controllers.project.create_project")
    def test_create_project_success_calls_model(self, mock_create_project):
        """A valid project create request is sent to the project model."""
        mock_create_project.return_value = 42

        with self.app.test_request_context(
            "/api/projects",
            method="POST",
            json={"name": " Model Room ", "description": "  CAD draft  "},
        ):
            session["user_email"] = "student@example.com"

            response, status_code = project.create_new_project()

        payload = response.get_json()
        created_project = mock_create_project.call_args.args[0]

        self.assertEqual(status_code, 201)
        self.assertTrue(payload["success"])
        self.assertEqual(payload["project"]["id"], 42)
        self.assertEqual(created_project["name"], "Model Room")
        self.assertEqual(created_project["description"], "CAD draft")
        self.assertEqual(created_project["owner_email"], "student@example.com")
        self.assertEqual(created_project["design_data"], [])

    @patch("app.controllers.project.get_projects_by_user")
    def test_get_user_projects_returns_model_projects(self, mock_get_projects):
        """The project list endpoint returns projects owned by the session user."""
        mock_get_projects.return_value = [
            {"id": 1, "name": "One"},
            {"id": 2, "name": "Two"},
        ]

        with self.app.test_request_context("/api/projects", method="GET"):
            session["user_email"] = "student@example.com"

            response, status_code = project.get_user_projects()

        self.assertEqual(status_code, 200)
        self.assertEqual(len(response.get_json()["projects"]), 2)
        mock_get_projects.assert_called_once_with("student@example.com")

    @patch("app.controllers.project.mark_project_opened")
    @patch("app.controllers.project.find_project_by_id")
    def test_get_project_marks_project_opened(self, mock_find_project, mock_mark_opened):
        """Opening a project updates its recent-project timestamp."""
        mock_find_project.return_value = {
            "id": 7,
            "name": "Saved Design",
            "design_data": [],
        }

        with self.app.test_request_context("/api/projects/7", method="GET"):
            session["user_email"] = "student@example.com"

            response, status_code = project.get_project_by_id(7)

        self.assertEqual(status_code, 200)
        self.assertEqual(response.get_json()["project"]["id"], 7)
        mock_find_project.assert_called_once_with(7, "student@example.com")
        mock_mark_opened.assert_called_once_with(7, "student@example.com")

    @patch("app.controllers.project.update_project_design")
    @patch("app.controllers.project.find_project_by_id")
    def test_save_project_design_updates_design_data(self, mock_find_project, mock_update_design):
        """Saving a design stores the object list for the project."""
        mock_find_project.return_value = {"id": 7, "name": "Saved Design"}
        design_data = [{"type": "cube", "name": "Cube 1"}]

        with self.app.test_request_context(
            "/api/projects/7/save",
            method="POST",
            json={"design_data": design_data},
        ):
            session["user_email"] = "student@example.com"

            response, status_code = project.save_project_design(7)

        self.assertEqual(status_code, 200)
        self.assertEqual(response.get_json()["object_count"], 1)
        mock_update_design.assert_called_once_with(
            7,
            "student@example.com",
            design_data,
        )

    def test_import_project_rejects_unknown_object_type(self):
        """Imported projects only accept supported CAD object types."""
        with self.app.test_request_context(
            "/api/projects/import",
            method="POST",
            json={
                "name": "Bad Import",
                "design_data": [{"type": "unknown-shape"}],
            },
        ):
            session["user_email"] = "student@example.com"

            response, status_code = project.import_project()

        self.assertEqual(status_code, 400)
        self.assertIn("unsupported type", response.get_json()["message"])

    @patch("app.controllers.project.update_project_details")
    @patch("app.controllers.project.find_project_by_id")
    def test_rename_project_updates_name(self, mock_find_project, mock_update_details):
        """Renaming a project updates the existing project details."""
        mock_find_project.return_value = {"id": 5, "description": "Old"}

        with self.app.test_request_context(
            "/api/projects/5",
            method="PATCH",
            json={"name": "Renamed", "description": "New"},
        ):
            session["user_email"] = "student@example.com"

            response, status_code = project.rename_project(5)

        self.assertEqual(status_code, 200)
        self.assertEqual(response.get_json()["project"]["name"], "Renamed")
        mock_update_details.assert_called_once_with(
            5,
            "student@example.com",
            "Renamed",
            "New",
        )

    @patch("app.controllers.project.delete_project_by_id")
    @patch("app.controllers.project.find_project_by_id")
    def test_delete_project_removes_owned_project(self, mock_find_project, mock_delete):
        """Deleting a project removes only an owned project."""
        mock_find_project.return_value = {"id": 5, "name": "Old"}

        with self.app.test_request_context("/api/projects/5", method="DELETE"):
            session["user_email"] = "student@example.com"

            response, status_code = project.delete_project(5)

        self.assertEqual(status_code, 200)
        self.assertTrue(response.get_json()["success"])
        mock_delete.assert_called_once_with(5, "student@example.com")


if __name__ == "__main__":
    unittest.main()
