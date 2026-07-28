import os
from pymongo import MongoClient
import redis
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/routine_tracker_db")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

class MongoDB:
    def __init__(self):
        self.client = None
        self.db = None

    def connect(self):
        self.client = MongoClient(MONGO_URL)
        # Use database name from URI or default to routine_tracker_db
        self.db = self.client.get_database("routine_tracker_db")
        print("Connected to MongoDB")

    def get_db(self):
        return self.db

    def close(self):
        if self.client:
            self.client.close()

class RedisClient:
    def __init__(self):
        self.client = None

    def connect(self):
        self.client = redis.from_url(REDIS_URL, decode_responses=True)
        print("Connected to Redis")

    def get_client(self):
        return self.client

    def close(self):
        pass

mongodb = MongoDB()
redis_client = RedisClient()
