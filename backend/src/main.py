import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.services.db import db_service
from src.services.scheduler import start_scheduler, stop_scheduler
from src.routes import auth, routines, tracker, webhooks

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup lifecycle
    logger.info("Initializing application services...")
    await db_service.connect()
    start_scheduler()
    
    yield
    
    # Shutdown lifecycle
    logger.info("Shutting down application services...")
    stop_scheduler()
    await db_service.disconnect()

app = FastAPI(
    title="Routine Tracker Twilio API",
    description="Phone Number Registration, Login & Daily Routine Tracking System with Twilio Calls",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For Nginx reverse-proxy deployment or direct dev connection
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes under /api
app.include_router(auth.router, prefix="/api")
app.include_router(routines.router, prefix="/api")
app.include_router(tracker.router, prefix="/api")
# We mount Twilio webhooks under /api as well (e.g. /api/webhooks/twilio/...)
app.include_router(webhooks.router, prefix="/api")

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "mongodb": "connected" if db_service.db is not None else "disconnected",
        "redis": "connected" if db_service.redis_client is not None else "disconnected"
    }
