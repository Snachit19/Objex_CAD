import pymysql
import config


class Database:
    def __init__(self):
        try:
            self.__connection = pymysql.connect(
                host=config.MYSQL_HOST,
                user=config.MYSQL_USER,
                password=config.MYSQL_PASSWORD,
                database=config.MYSQL_DATABASE,
                cursorclass=pymysql.cursors.DictCursor
            )
            print("Database connected successfully!")
        except pymysql.MySQLError as error:
            print("Database connection failed!")
            print("Error:", error)
            raise error

    def fetch_one(self, query, params=None):
        cursor = self.__connection.cursor()
        cursor.execute(query, params)
        result = cursor.fetchone()
        cursor.close()
        return result

    def fetch_all(self, query, params=None):
        cursor = self.__connection.cursor()
        cursor.execute(query, params)
        results = cursor.fetchall()
        cursor.close()
        return results

    def execute(self, query, params=None):
        cursor = self.__connection.cursor()
        cursor.execute(query, params)
        self.__connection.commit()
        last_id = cursor.lastrowid
        cursor.close()
        return last_id

    def close(self):
        self.__connection.close()

    @staticmethod
    def create_tables():
        db = Database()

        db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(150) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        db.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                description TEXT,
                owner_email VARCHAR(150) NOT NULL,
                design_data JSON NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """)
        # Add design_data column if it does not already exist
        try:
            db.execute("""
                ALTER TABLE projects
                ADD COLUMN design_data LONGTEXT NULL
            """)
            print("design_data column added to projects table.")
    
        except Exception as error:
            if "Duplicate column name" in str(error):
                print("design_data column already exists.")
            else:
                print("Could not add design_data column:", error)

        db.close()