import pymysql
import config


class Database:
    _database_ready = False

    def __init__(self):
        try:
            if not Database._database_ready:
                self.create_database()
                Database._database_ready = True

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

    @staticmethod
    def create_database():
        database_name = config.MYSQL_DATABASE.replace("`", "``")
        connection = pymysql.connect(
            host=config.MYSQL_HOST,
            user=config.MYSQL_USER,
            password=config.MYSQL_PASSWORD,
            cursorclass=pymysql.cursors.DictCursor
        )
        cursor = connection.cursor()
        cursor.execute(
            "CREATE DATABASE IF NOT EXISTS `{}`".format(database_name)
        )
        connection.commit()
        cursor.close()
        connection.close()

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
                last_opened_at DATETIME NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """)

        design_data_column = db.fetch_one("""
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME = 'projects'
              AND COLUMN_NAME = 'design_data'
        """, (config.MYSQL_DATABASE,))

        if not design_data_column:
            db.execute("""
                ALTER TABLE projects
                ADD COLUMN design_data JSON NULL
            """)

        last_opened_column = db.fetch_one("""
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME = 'projects'
              AND COLUMN_NAME = 'last_opened_at'
        """, (config.MYSQL_DATABASE,))

        if not last_opened_column:
            db.execute("""
                ALTER TABLE projects
                ADD COLUMN last_opened_at DATETIME NULL
                AFTER created_at
            """)

        db.close()
