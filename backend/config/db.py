from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

client = MongoClient(
    os.getenv("MONGO_URI", "mongodb://localhost:27017/"),
    serverSelectionTimeoutMS=3000,
    connectTimeoutMS=3000,
    tlsAllowInvalidCertificates=True
)

db = client[os.getenv("DB_NAME", "objex_cad")]