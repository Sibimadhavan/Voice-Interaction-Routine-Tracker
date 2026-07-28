from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
from repositories.routine_repository import routine_repository
from repositories.user_repository import user_repository
from repositories.log_repository import log_repository
from models.log import Log
from services.twilio import twilio_service

class RoutineScheduler:
    def __init__(self):
        self.scheduler = BackgroundScheduler()

    def start(self):
        # Run every minute
        self.scheduler.add_job(self.check_reminders, 'cron', minute='*')
        self.scheduler.start()
        print("Background Routine Reminder Scheduler started")

    def check_reminders(self):
        now = datetime.now()
        current_time_str = now.strftime("%H:%M")
        current_date_str = now.strftime("%Y-%m-%d")

        print(f"[Scheduler] Checking reminders for {current_date_str} at {current_time_str}")

        # Fetch all user routines
        routines = routine_repository.get_all_routines()
        for r in routines:
            # Check if scheduled time matches the current HH:MM
            if r["time"] == current_time_str:
                user = user_repository.get_by_id(r["userId"])
                if not user:
                    continue

                # Ensure log exists for today
                log_doc = log_repository.get_log(user["id"], r["id"], current_date_str)
                if not log_doc:
                    # Skip routines created *today*
                    created_date_str = r["createdAt"].strftime("%Y-%m-%d")
                    if created_date_str == current_date_str:
                        continue

                    # Create default pending log
                    new_log = Log(
                        routineId=r["id"],
                        userId=user["id"],
                        date=current_date_str,
                        status="pending"
                    )
                    log_doc = log_repository.create_or_update(new_log)

                # Initiate reminder call if routine is still pending
                if log_doc["status"] == "pending":
                    print(f"[Scheduler] Initiating Twilio voice reminder call to {user['phone']} for '{r['title']}'")
                    twilio_service.initiate_reminder_call(user["phone"], r["id"], current_date_str)

    def shutdown(self):
        if self.scheduler.running:
            self.scheduler.shutdown()

routine_scheduler = RoutineScheduler()
