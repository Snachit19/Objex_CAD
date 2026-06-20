from flask import jsonify, request, session


class BaseController:
    """Shared controller helpers used by class-style controllers."""

    def get_json_data(self):
        return request.get_json(silent=True) or {}

    def get_form_data(self, *fields):
        return tuple(request.form.get(field, "").strip() for field in fields)

    def is_logged_in(self):
        return "user_email" in session

    def get_current_user_email(self):
        return session.get("user_email")

    def get_current_user_name(self):
        return session.get("user_name", "User")

    def json_response(self, success, message, status_code=200, **extra):
        payload = {
            "success": success,
            "message": message
        }
        payload.update(extra)
        return jsonify(payload), status_code
