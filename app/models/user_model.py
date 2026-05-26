from app.models.database import get_db_connection


def find_user_by_email(email):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute(
        "SELECT * FROM users WHERE email = %s",
        (email,)
    )

    user = cursor.fetchone()

    cursor.close()
    connection.close()

    return user


def create_user(user_data):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
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

    connection.commit()
    user_id = cursor.lastrowid

    cursor.close()
    connection.close()

    return user_id