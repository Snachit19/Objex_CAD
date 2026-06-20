"""
Run with:
    python -m unittest discover -s Test -v
"""

import unittest

from flask import Flask

from app.middleware.auth_middleware import login_required


class TestFlaskBasics(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.secret_key = "test-secret-key"

        @self.app.route("/")
        def login_page():
            return "login page"

        @self.app.route("/dashboard")
        @login_required
        def dashboard_page():
            return "dashboard page"

        @self.app.route("/api/private")
        @login_required
        def private_api():
            return {"success": True, "message": "private api"}

        self.client = self.app.test_client()

    def test_locked_page_redirects_guest(self):
        """A guest user is redirected away from protected pages."""
        response = self.client.get("/dashboard")

        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.location.endswith("/"))

    def test_locked_page_opens_for_logged_in_user(self):
        """A logged-in user can open protected pages."""
        with self.client.session_transaction() as sess:
            sess["user_email"] = "student@example.com"

        response = self.client.get("/dashboard")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.decode(), "dashboard page")

    def test_api_locked_route_returns_json_for_guest(self):
        """Protected API routes return JSON instead of a page redirect."""
        response = self.client.get("/api/private")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json()["message"], "Login required")

    def test_login_page_is_public(self):
        """Anyone can open the login page."""
        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("login page", response.data.decode())


if __name__ == "__main__":
    unittest.main()
