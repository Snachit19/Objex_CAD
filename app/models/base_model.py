from abc import ABC, abstractmethod

from app.models.database import Database


class BaseModel(ABC):
    """Base model with shared database helpers for MVC/OOP structure."""

    @property
    @abstractmethod
    def table(self):
        pass

    def find_by_id(self, record_id):
        db = Database()
        result = db.fetch_one(
            f"SELECT * FROM {self.table} WHERE id = %s",
            (record_id,)
        )
        db.close()
        return result

    def find_by(self, column, value):
        db = Database()
        result = db.fetch_one(
            f"SELECT * FROM {self.table} WHERE {column} = %s",
            (value,)
        )
        db.close()
        return result

    def find_all(self, order_by="id"):
        db = Database()
        results = db.fetch_all(
            f"SELECT * FROM {self.table} ORDER BY {order_by}"
        )
        db.close()
        return results

    def count_all(self):
        db = Database()
        result = db.fetch_one(f"SELECT COUNT(*) AS total FROM {self.table}")
        db.close()
        return result["total"] if result else 0

    def delete_by_id(self, record_id):
        db = Database()
        db.execute(
            f"DELETE FROM {self.table} WHERE id = %s",
            (record_id,)
        )
        db.close()
        return True
