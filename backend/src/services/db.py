import logging
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as redis
from src.config.settings import settings

logger = logging.getLogger(__name__)

class DatabaseService:
    def __init__(self):
        self.mongo_client: AsyncIOMotorClient = None
        self.db = None
        self.redis_client: redis.Redis = None

    async def connect(self):
        # Connect to MongoDB
        logger.info(f"Connecting to MongoDB at {settings.mongodb_url}")
        try:
            self.mongo_client = AsyncIOMotorClient(settings.mongodb_url)
            # Access the database name from the URL or default to 'routine_tracker'
            db_name = settings.mongodb_url.split("/")[-1].split("?")[0] or "routine_tracker"
            self.db = self.mongo_client[db_name]
            
            # Setup unique index on user.phone
            await self.db.user.create_index("phone", unique=True)
            # Setup compound indexes for track and routine if necessary
            await self.db.routine.create_index([("userId", 1), ("isActive", 1)])
            await self.db.daily_routine_track.create_index([("userId", 1), ("date", 1)])
            await self.db.daily_routine_track.create_index([("date", 1), ("status", 1)])
            logger.info("MongoDB connection and indexes initialized successfully")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise e

        # Connect to Redis
        logger.info(f"Connecting to Redis at {settings.redis_url}")
        try:
            self.redis_client = redis.from_url(settings.redis_url, decode_responses=True)
            # Test connection
            await self.redis_client.ping()
            logger.info("Redis connection initialized successfully")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise e

    async def disconnect(self):
        if self.mongo_client:
            self.mongo_client.close()
            logger.info("MongoDB connection closed")
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Redis connection closed")

db_service = DatabaseService()
