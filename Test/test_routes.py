import unittest
from unittest.mock import patch


class TestApplicationRoutes(unittest.TestCase):
    def setUp(self):
        self.create_tables_patcher = patch("app.Database.create_tables")
        self.mock_create_tables = self.create_tables_patcher.start()

        from app import create_app

        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    def tearDown(self):
        self.create_tables_patcher.stop()

    def login_session(self):
        with self.client.session_transaction() as sess:
            sess["user_email"] = "student@example.com"
            sess["user_name"] = "Student"

    def test_public_pages_open_without_login(self):
        """Login and register pages are public."""
        self.assertEqual(self.client.get("/").status_code, 200)
        self.assertEqual(self.client.get("/register").status_code, 200)

    def test_protected_pages_redirect_guests(self):
        """Dashboard-style pages require login."""
        protected_paths = [
            "/dashboard",
            "/projects",
            "/help",
            "/settings",
            "/cad/1",
        ]

        for path in protected_paths:
            with self.subTest(path=path):
                response = self.client.get(path)

                self.assertEqual(response.status_code, 302)
                self.assertTrue(response.location.endswith("/"))

    def test_protected_pages_open_for_logged_in_user(self):
        """Logged-in users can open main Jinja pages."""
        self.login_session()

        protected_paths = [
            "/dashboard",
            "/projects",
            "/help",
            "/settings",
            "/cad/1",
        ]

        for path in protected_paths:
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 200)

    def test_project_status_api_requires_login(self):
        """Project API routes stay protected."""
        response = self.client.get("/api/projects/status")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json()["message"], "Login required")

    def test_project_status_api_works_for_logged_in_user(self):
        """A logged-in user can reach the project status API."""
        self.login_session()

        response = self.client.get("/api/projects/status")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["success"])


if __name__ == "__main__":
    unittest.main()
