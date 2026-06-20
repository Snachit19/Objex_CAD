import unittest
from unittest.mock import patch

from app.models import database


class FakeCursor:
    def __init__(self, fetch_results=None):
        self.fetch_results = list(fetch_results or [])
        self.queries = []
        self.lastrowid = 123

    def execute(self, query, params=None):
        self.queries.append((query, params))

    def fetchone(self):
        if self.fetch_results:
            return self.fetch_results.pop(0)
        return None

    def fetchall(self):
        if self.fetch_results:
            result = self.fetch_results.pop(0)
            return result if isinstance(result, list) else [result]
        return []

    def close(self):
        pass


class FakeConnection:
    def __init__(self, fetch_results=None):
        self.cursor_instance = FakeCursor(fetch_results)
        self.committed = False
        self.closed = False

    def cursor(self):
        return self.cursor_instance

    def commit(self):
        self.committed = True

    def close(self):
        self.closed = True


class TestDatabaseSetup(unittest.TestCase):
    def setUp(self):
        database.Database._database_ready = False

    def tearDown(self):
        database.Database._database_ready = False

    @patch("app.models.database.config")
    @patch("app.models.database.pymysql.connect")
    def test_create_database_uses_configured_database_name(self, mock_connect, mock_config):
        """Database creation uses CREATE DATABASE IF NOT EXISTS."""
        fake_connection = FakeConnection()
        mock_connect.return_value = fake_connection
        mock_config.MYSQL_HOST = "localhost"
        mock_config.MYSQL_USER = "root"
        mock_config.MYSQL_PASSWORD = ""
        mock_config.MYSQL_DATABASE = "objex_test"

        database.Database.create_database()

        executed_query = fake_connection.cursor_instance.queries[0][0]

        self.assertIn("CREATE DATABASE IF NOT EXISTS", executed_query)
        self.assertIn("`objex_test`", executed_query)
        self.assertTrue(fake_connection.committed)
        self.assertTrue(fake_connection.closed)

    @patch("app.models.database.config")
    @patch("app.models.database.pymysql.connect")
    def test_database_constructor_creates_database_once(self, mock_connect, mock_config):
        """The Database class creates the database before opening app connection."""
        first_connection = FakeConnection()
        second_connection = FakeConnection()
        third_connection = FakeConnection()
        mock_connect.side_effect = [first_connection, second_connection, third_connection]
        mock_config.MYSQL_HOST = "localhost"
        mock_config.MYSQL_USER = "root"
        mock_config.MYSQL_PASSWORD = ""
        mock_config.MYSQL_DATABASE = "objex_test"

        first_db = database.Database()
        second_db = database.Database()

        first_db.close()
        second_db.close()

        self.assertEqual(mock_connect.call_count, 3)
        self.assertTrue(database.Database._database_ready)

    @patch("app.models.database.config")
    @patch("app.models.database.pymysql.connect")
    def test_create_tables_builds_required_tables(self, mock_connect, mock_config):
        """Table creation defines users and projects tables."""
        create_db_connection = FakeConnection()
        app_connection = FakeConnection(fetch_results=[None, None])
        mock_connect.side_effect = [create_db_connection, app_connection]
        mock_config.MYSQL_HOST = "localhost"
        mock_config.MYSQL_USER = "root"
        mock_config.MYSQL_PASSWORD = ""
        mock_config.MYSQL_DATABASE = "objex_test"

        database.Database.create_tables()

        executed_sql = "\n".join(
            query for query, _params in app_connection.cursor_instance.queries
        )

        self.assertIn("CREATE TABLE IF NOT EXISTS users", executed_sql)
        self.assertIn("CREATE TABLE IF NOT EXISTS projects", executed_sql)
        self.assertIn("design_data JSON", executed_sql)
        self.assertIn("last_opened_at", executed_sql)
        self.assertTrue(app_connection.closed)


if __name__ == "__main__":
    unittest.main()
