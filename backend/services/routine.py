from datetime import datetime
from uuid import uuid4
from repositories.routine_repository import routine_repository
from repositories.log_repository import log_repository
from models.routine import Routine
from models.log import Log
from fastapi import HTTPException

class RoutineService:
    def get_user_routines(self, user_id: str):
        """Fetch all routines created by the user"""
        return routine_repository.get_by_user_id(user_id)

    def create_routine(self, user_id: str, title: str, description: str, time: str):
        """Create a new routine. It will automatically apply from tomorrow onwards"""
        new_routine = Routine(
            userId=user_id,
            title=title,
            description=description,
            time=time
        )
        return routine_repository.create(new_routine)

    def update_routine(self, user_id: str, routine_id: str, title: str, description: str, time: str):
        """Update an existing routine. It will apply from tomorrow onwards"""
        routine = routine_repository.get_by_id(routine_id)
        if not routine:
            raise HTTPException(status_code=404, detail="Routine not found")
        if routine["userId"] != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized to modify this routine")

        update_data = {
            "title": title,
            "description": description,
            "time": time,
            "updatedAt": datetime.utcnow()
        }
        return routine_repository.update(routine_id, update_data)

    def delete_routine(self, user_id: str, routine_id: str):
        """Delete a routine"""
        routine = routine_repository.get_by_id(routine_id)
        if not routine:
            raise HTTPException(status_code=404, detail="Routine not found")
        if routine["userId"] != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized to delete this routine")

        return routine_repository.delete(routine_id)

    def get_or_create_today_checklist(self, user_id: str, local_date_str: str, current_time_str: str):
        """
        Generate today's checklist by copying active routines to log entries for today.
        If logs already exist, return them.
        Filters out routines created *today* so they only appear starting tomorrow.
        """
        routines = routine_repository.get_by_user_id(user_id)
        
        checklist = []
        for r in routines:
            # Requirements: "Updated routines should be used from the following day onwards"
            # If routine was created today, skip it for today's checklist
            created_date_str = r["createdAt"].strftime("%Y-%m-%d")
            if created_date_str == local_date_str:
                continue

            # Check if log already exists
            log_doc = log_repository.get_log(user_id, r["id"], local_date_str)
            if not log_doc:
                # Create a default pending log
                new_log = Log(
                    routineId=r["id"],
                    userId=user_id,
                    date=local_date_str,
                    status="pending"
                )
                log_doc = log_repository.create_or_update(new_log)

            # Determine if missed / flagged (scheduled time passed and status is still pending)
            is_flaged = False
            if log_doc["status"] == "pending" and r["time"] < current_time_str:
                is_flaged = True

            checklist.append({
                "routineId": r["id"],
                "title": r["title"],
                "description": r["description"],
                "time": r["time"],
                "status": log_doc["status"],
                "flagged": is_flaged,
                "timestamp": log_doc["timestamp"]
            })

        # Sort by time
        checklist.sort(key=lambda x: x["time"])
        return checklist

    def update_log_status(self, user_id: str, routine_id: str, date_str: str, status: str):
        """Manually mark a routine status for a given day"""
        routine = routine_repository.get_by_id(routine_id)
        if not routine:
            raise HTTPException(status_code=404, detail="Routine not found")
        if routine["userId"] != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized")

        log_doc = Log(
            routineId=routine_id,
            userId=user_id,
            date=date_str,
            status=status
        )
        return log_repository.create_or_update(log_doc)

    def get_user_history(self, user_id: str, start_date_str: str, end_date_str: str):
        """Fetch historical log completion statistics for routines"""
        logs = log_repository.get_by_user_and_date_range(user_id, start_date_str, end_date_str)
        routines = routine_repository.get_by_user_id(user_id)
        routine_map = {r["id"]: r for r in routines}

        history = []
        for l in logs:
            r = routine_map.get(l["routineId"])
            title = r["title"] if r else "Deleted Routine"
            time = r["time"] if r else "00:00"
            history.append({
                "logId": l["id"],
                "routineId": l["routineId"],
                "title": title,
                "time": time,
                "date": l["date"],
                "status": l["status"],
                "timestamp": l["timestamp"]
            })

        # Sort by date descending, then time ascending
        history.sort(key=lambda x: (x["date"], x["time"]), reverse=True)
        return history

routine_service = RoutineService()
