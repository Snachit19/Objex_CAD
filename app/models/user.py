from app.models.database import Database
from app.models.base_model import BaseModel


def find_user_by_email(email):
    db = Database()

    user = db.fetch_one(
        "SELECT * FROM users WHERE email = %s",
        (email,)
    )

    db.close()
    return user


def create_user(user_data):
    db = Database()

    user_id = db.execute(
        """
        INSERT INTO users (name, email, password, created_at)
        VALUES (%s, %s, %s, %s)
        """,
        (
            user_data["name"],
            user_data["email"],
            user_data["password"],
            user_data["created_at"]
        )
    )

    db.close()
    return user_id


def update_user_name(email, name):
    db = Database()

    db.execute(
        """
        UPDATE users
        SET name = %s
        WHERE email = %s
        """,
        (name, email)
    )

    db.close()
    return True


class User(BaseModel):
    """User model class for the MVC/OOP project structure."""

    @property
    def table(self):
        return "users"

    def find_by_email(self, email):
        return self.find_by("email", email)

    def create(self, user_data):
        return create_user(user_data)

    def update_name(self, email, name):
        return update_user_name(email, name)
