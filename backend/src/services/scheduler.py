import asyncio
import logging
import pytz
from datetime import datetime
from src.config.settings import settings
from src.services.db import db_service
from src.services.twilio_service import twilio_service

logger = logging.getLogger(__name__)
scheduler_task: asyncio.Task = None

async def check_routines_loop():
    """
    Background worker loop that runs periodically to check for scheduled routines
    that need a Twilio call reminder.
    """
    # Wait for DB services to initialize first
    await asyncio.sleep(5)
    logger.info("Routine check background worker loop started.")
    
    while True:
        try:
            # 1. Fetch current time in user's configured timezone
            try:
                tz = pytz.timezone(settings.timezone)
            except Exception as tz_err:
                logger.error(f"Invalid timezone configuration: {settings.timezone}. Defaulting to UTC. Error: {tz_err}")
                tz = pytz.utc
                
            now_local = datetime.now(tz)
            date_str = now_local.strftime("%Y-%m-%d")
            time_str = now_local.strftime("%H:%M")
            
            logger.debug(f"Checking pending reminders for local date: {date_str}, time: {time_str}")
            
            # 2. Find tracks that are "Pending", time <= current local time, and reminder not called
            cursor = db_service.db.daily_routine_track.find({
                "date": date_str,
                "status": "Pending",
                "time": {"$lte": time_str},
                "reminderCalled": False
            })
            pending_tracks = await cursor.to_list(length=100)
            
            for track in pending_tracks:
                track_id = track["id"]
                user_id = track["userId"]
                title = track["title"]
                
                # Fetch User phone number
                user = await db_service.db.user.find_one({"id": user_id})
                if not user or not user.get("phone"):
                    logger.warning(f"User profile or phone not found for user: {user_id}. Skipping track: {track_id}")
                    # Update so we don't keep polling this invalid item
                    await db_service.db.daily_routine_track.update_one(
                        {"id": track_id},
                        {"$set": {"reminderCalled": True, "updatedAt": datetime.utcnow()}}
                    )
                    continue
                
                phone = user["phone"]
                
                # 3. Mark called FIRST to prevent concurrent loops or calls triggering multiple times
                await db_service.db.daily_routine_track.update_one(
                    {"id": track_id},
                    {"$set": {
                        "reminderCalled": True,
                        "updatedAt": datetime.utcnow()
                    }}
                )
                
                # 4. Initiate Twilio outbound reminder call
                logger.info(f"Triggering routine reminder call. Track: {track_id}, User: {phone}, Title: '{title}'")
                try:
                    await twilio_service.initiate_reminder_call(phone, track_id, title)
                except Exception as call_err:
                    logger.error(f"Failed to initiate Twilio reminder call for track {track_id}: {call_err}")
                    
        except Exception as loop_err:
            logger.error(f"Error in background check loop: {loop_err}")
            
        # Check every 30 seconds
        await asyncio.sleep(30)

def start_scheduler():
    global scheduler_task
    if scheduler_task is None:
        scheduler_task = asyncio.create_task(check_routines_loop())
        logger.info("Scheduler task created in asyncio event loop.")

def stop_scheduler():
    global scheduler_task
    if scheduler_task:
        scheduler_task.cancel()
        scheduler_task = None
        logger.info("Scheduler task cancelled.")
