import unittest
from unittest.mock import patch

from flask import Flask, get_flashed_messages, session
from werkzeug.security import generate_password_hash

from app.controllers import auth


def make_test_app():
    app = Flask(__name__)
    app.secret_key = "test-secret-key"
    return app


class TestRegisterController(unittest.TestCase):
    def setUp(self):
        self.app = make_test_app()

    def test_register_empty_json_is_rejected(self):
        """Registration needs JSON data."""
        with self.app.test_request_context("/api/register", method="POST", json={}):
            response, status_code = auth.register()

        self.assertEqual(status_code, 400)
        self.assertFalse(response.get_json()["success"])
        self.assertEqual(response.get_json()["message"], "No data provided")

    def test_register_missing_email_or_password_is_rejected(self):
        """Email and password are required."""
        with self.app.test_request_context(
            "/api/register",
            method="POST",
            json={"name": "Test User", "email": "", "password": ""},
        ):
            response, status_code = auth.register()

        self.assertEqual(status_code, 400)
        self.assertEqual(
            response.get_json()["message"],
            "Email and password are required",
        )

    def test_register_short_password_is_rejected(self):
        """Password must be at least 6 characters."""
        with self.app.test_request_context(
            "/api/register",
            method="POST",
            json={"name": "Test User", "email": "test@example.com", "password": "123"},
        ):
            response, status_code = auth.register()

        self.assertEqual(status_code, 400)
        self.assertEqual(
            response.get_json()["message"],
            "Password must be at least 6 characters",
        )

    @patch("app.controllers.auth.create_user")
    @patch("app.controllers.auth.find_user_by_email")
    def test_register_duplicate_email_is_rejected(self, mock_find_user, mock_create_user):
        """Existing email should not create another account."""
        mock_find_user.return_value = {"email": "taken@example.com"}

        with self.app.test_request_context(
            "/api/register",
            method="POST",
            json={
                "name": "Taken User",
                "email": "taken@example.com",
                "password": "secret1",
            },
        ):
            response, status_code = auth.register()

        self.assertEqual(status_code, 409)
        self.assertEqual(response.get_json()["message"], "Account already exists")
        mock_create_user.assert_not_called()

    @patch("app.controllers.auth.create_user")
    @patch("app.controllers.auth.find_user_by_email")
    def test_register_success_creates_user(self, mock_find_user, mock_create_user):
        """Valid registration creates a new user."""
        mock_find_user.return_value = None
        mock_create_user.return_value = 1

        with self.app.test_request_context(
            "/api/register",
            method="POST",
            json={
                "name": "Alice",
                "email": "alice@example.com",
                "password": "secret1",
            },
        ):
            response, status_code = auth.register()

        self.assertEqual(status_code, 201)
        self.assertTrue(response.get_json()["success"])
        mock_create_user.assert_called_once()
        created_user = mock_create_user.call_args.args[0]
        self.assertEqual(created_user["name"], "Alice")
        self.assertEqual(created_user["email"], "alice@example.com")
        self.assertNotEqual(created_user["password"], "secret1")


class TestLoginController(unittest.TestCase):
    def setUp(self):
        self.app = make_test_app()

    def test_login_empty_json_is_rejected(self):
        """Login needs JSON data."""
        with self.app.test_request_context("/api/login", method="POST", json={}):
            response, status_code = auth.login()

        self.assertEqual(status_code, 400)
        self.assertEqual(response.get_json()["message"], "No data provided")

    def test_login_missing_fields_is_rejected(self):
        """Email and password are required for login."""
        with self.app.test_request_context(
            "/api/login",
            method="POST",
            json={"email": "", "password": ""},
        ):
            response, status_code = auth.login()

        self.assertEqual(status_code, 400)
        self.assertEqual(
            response.get_json()["message"],
            "Email and password are required",
        )

    @patch("app.controllers.auth.find_user_by_email")
    def test_login_unknown_user_is_rejected(self, mock_find_user):
        """Unknown email should not create a session."""
        mock_find_user.return_value = None

        with self.app.test_request_context(
            "/api/login",
            method="POST",
            json={"email": "missing@example.com", "password": "secret1"},
        ):
            response, status_code = auth.login()
            self.assertNotIn("user_email", session)

        self.assertEqual(status_code, 401)
        self.assertEqual(response.get_json()["message"], "Invalid email or password")

    @patch("app.controllers.auth.find_user_by_email")
    def test_login_wrong_password_is_rejected(self, mock_find_user):
        """Wrong password should not create a session."""
        mock_find_user.return_value = {
            "name": "Bob",
            "email": "bob@example.com",
            "password": generate_password_hash("correct-password"),
        }

        with self.app.test_request_context(
            "/api/login",
            method="POST",
            json={"email": "bob@example.com", "password": "wrong-password"},
        ):
            response, status_code = auth.login()
            self.assertNotIn("user_email", session)

        self.assertEqual(status_code, 401)
        self.assertEqual(response.get_json()["message"], "Invalid email or password")

    @patch("app.controllers.auth.find_user_by_email")
    def test_login_success_sets_session(self, mock_find_user):
        """Correct login stores the user in session."""
        mock_find_user.return_value = {
            "name": "Bob",
            "email": "bob@example.com",
            "password": generate_password_hash("secret1"),
        }

        with self.app.test_request_context(
            "/api/login",
            method="POST",
            json={"email": "bob@example.com", "password": "secret1"},
        ):
            response, status_code = auth.login()
            self.assertEqual(session["user_email"], "bob@example.com")
            self.assertEqual(session["user_name"], "Bob")

        self.assertEqual(status_code, 200)
        self.assertTrue(response.get_json()["success"])


class TestAccountController(unittest.TestCase):
    def setUp(self):
        self.app = make_test_app()

    def test_logout_clears_session(self):
        """Logout clears every session value."""
        with self.app.test_request_context("/api/logout", method="POST"):
            session["user_email"] = "alice@example.com"
            session["user_name"] = "Alice"

            response, status_code = auth.logout()
            self.assertNotIn("user_email", session)
            self.assertNotIn("user_name", session)

        self.assertEqual(status_code, 200)
        self.assertTrue(response.get_json()["success"])

    def test_me_requires_login(self):
        """The /api/me controller is protected."""
        with self.app.test_request_context("/api/me", method="GET"):
            response, status_code = auth.me()

        self.assertEqual(status_code, 401)
        self.assertEqual(response.get_json()["message"], "Login required")

    def test_me_returns_session_user(self):
        """A logged-in user can see their profile details."""
        with self.app.test_request_context("/api/me", method="GET"):
            session["user_email"] = "alice@example.com"
            session["user_name"] = "Alice"

            response, status_code = auth.me()

        self.assertEqual(status_code, 200)
        self.assertEqual(response.get_json()["email"], "alice@example.com")
        self.assertEqual(response.get_json()["name"], "Alice")

    @patch("app.controllers.auth.update_user_name")
    def test_update_profile_success_changes_name(self, mock_update_user_name):
        """Changing profile name updates storage and session."""
        mock_update_user_name.return_value = True

        with self.app.test_request_context(
            "/api/me",
            method="PATCH",
            json={"name": "New Name"},
        ):
            session["user_email"] = "alice@example.com"
            session["user_name"] = "Alice"

            response, status_code = auth.update_profile()
            self.assertEqual(session["user_name"], "New Name")

        self.assertEqual(status_code, 200)
        self.assertEqual(response.get_json()["name"], "New Name")
        mock_update_user_name.assert_called_once_with("alice@example.com", "New Name")


if __name__ == "__main__":
    unittest.main()
