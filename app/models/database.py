import mysql.connector
from dotenv import load_dotenv
import os

load_dotenv()


def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "localhost"),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", ""),
        database=os.getenv("MYSQL_DATABASE", "objex_cad")
    )


def test_connection():
    try:
        connection = get_db_connection()
        connection.close()
        print("MySQL connected successfully")
        return True
    except Exception as error:
        print("MySQL connection failed:", error)
        return False