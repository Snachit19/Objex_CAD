from app.models.database import Database


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