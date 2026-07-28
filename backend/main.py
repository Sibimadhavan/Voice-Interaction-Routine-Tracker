import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from config.db import mongodb, redis_client
from services.twilio import twilio_service
from services.scheduler import routine_scheduler
from routes import auth, routine, twilio

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("main")

app = FastAPI(
    title="Routine Tracker Twilio",
    description="Phone Number Registration, Login & Daily Routine Tracking System",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handlers to match API specs
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail
            }
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled Server Exception")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": str(exc) or "An unexpected server error occurred."
            }
        }
    )

# Routers mounting
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(routine.router, prefix="/api", tags=["Routines & Dashboard"])
app.include_router(twilio.router, prefix="/api/twilio", tags=["Twilio Voice Webhooks"])

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing databases...")
    mongodb.connect()
    redis_client.connect()
    twilio_service.connect()
    
    logger.info("Starting background reminder call scheduler...")
    routine_scheduler.start()
    logger.info("Server startup complete.")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down background scheduler...")
    routine_scheduler.shutdown()
    
    logger.info("Closing database connections...")
    mongodb.close()
    redis_client.close()
    logger.info("Server shutdown complete.")

@app.get("/")
async def root():
    return {
        "status": "healthy",
        "app": "Routine Tracker with Twilio",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
