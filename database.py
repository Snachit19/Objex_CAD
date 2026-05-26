from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("DB_NAME", "objex_cad")

client = MongoClient(
    MONGO_URI,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=5000
)

db = client[DB_NAME]

users_collection = db["users"]
projects_collection = db["projects"]


def test_connection():
    try:
        client.admin.command("ping")
        print("MongoDB connected successfully")
        return True
    except Exception as error:
        print("MongoDB connection failed:", error)
        return False