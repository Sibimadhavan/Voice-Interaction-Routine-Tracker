from fastapi import APIRouter, Depends, HTTPException, status, Query
from datetime import datetime
import uuid
from typing import Optional
from src.services.db import db_service
from src.middlewares.auth import get_current_user_id
from src.validators.routines import TrackStatusUpdateRequest

router = APIRouter(prefix="/tracker", tags=["tracker"])

def get_current_date_and_time():
    """
    Helper to get current date (YYYY-MM-DD) and time (HH:MM) in UTC.
    """
    now = datetime.utcnow()
    return now.strftime("%Y-%m-%d"), now.strftime("%H:%M")

@router.get("/today")
async def get_today_tracker(
    date: Optional[str] = Query(None, description="Client local date in YYYY-MM-DD format"),
    userId: str = Depends(get_current_user_id)
):
    """
    Get tracker items for a specific date (defaults to UTC today).
    If they don't exist, instantiate them from the user's active templates.
    """
    utc_today, utc_now_time = get_current_date_and_time()
    target_date = date or utc_today
    
    # 1. Fetch existing tracks for target date
    cursor = db_service.db.daily_routine_track.find({"userId": userId, "date": target_date})
    tracks = await cursor.to_list(length=100)
    
    # 2. If no tracks exist and it is today or in the future, instantiate them from active templates
    # (We can instantiate for any date, but typically today or future. For history, if no data exists, we leave it empty)
    if not tracks:
        # Fetch active routines
        routine_cursor = db_service.db.routine.find({"userId": userId, "isActive": True})
        routines = await routine_cursor.to_list(length=100)
        
        if routines:
            new_tracks = []
            now = datetime.utcnow()
            for r in routines:
                track_id = str(uuid.uuid4())
                track_doc = {
                    "id": track_id,
                    "userId": userId,
                    "routineId": r["id"],
                    "date": target_date,
                    "title": r["title"],
                    "time": r["time"],
                    "status": "Pending",
                    "statusUpdatedAt": now,
                    "reminderCalled": False,
                    "reminderResponse": None,
                    "reminderResponseAt": None,
                    "createdAt": now,
                    "updatedAt": now
                }
                new_tracks.append(track_doc)
            
            if new_tracks:
                await db_service.db.daily_routine_track.insert_many(new_tracks)
                tracks = new_tracks

    # 3. Format and compute "isMissed" field on the fly
    # A routine is missed if status is 'Pending' AND (date is in the past OR (date is today AND scheduled time has passed))
    formatted_tracks = []
    for t in tracks:
        is_past_date = t["date"] < utc_today
        is_today_past_time = (t["date"] == utc_today) and (t["time"] < utc_now_time)
        is_missed = (t["status"] == "Pending") and (is_past_date or is_today_past_time)
        
        formatted_tracks.append({
            "id": t["id"],
            "routineId": t["routineId"],
            "date": t["date"],
            "title": t["title"],
            "time": t["time"],
            "status": t["status"],
            "statusUpdatedAt": t["statusUpdatedAt"].isoformat() if isinstance(t.get("statusUpdatedAt"), datetime) else t.get("statusUpdatedAt"),
            "reminderCalled": t["reminderCalled"],
            "reminderResponse": t.get("reminderResponse"),
            "reminderResponseAt": t["reminderResponseAt"].isoformat() if isinstance(t.get("reminderResponseAt"), datetime) else t.get("reminderResponseAt"),
            "isMissed": is_missed
        })
        
    # Sort tracks by scheduled time
    formatted_tracks.sort(key=lambda x: x["time"])
    
    return {
        "success": True,
        "data": formatted_tracks
    }

@router.patch("/{track_id}/status")
async def update_track_status(
    track_id: str,
    payload: TrackStatusUpdateRequest,
    userId: str = Depends(get_current_user_id)
):
    """
    Manually mark an item's status (Completed, Pending, or Will Complete Later).
    """
    track = await db_service.db.daily_routine_track.find_one({"id": track_id})
    if not track:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tracker item not found"
        )
        
    if track["userId"] != userId:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this tracker item"
        )
        
    now = datetime.utcnow()
    await db_service.db.daily_routine_track.update_one(
        {"id": track_id},
        {
            "$set": {
                "status": payload.status,
                "statusUpdatedAt": now,
                "updatedAt": now
            }
        }
    )
    
    return {
        "success": True,
        "data": {
            "id": track_id,
            "status": payload.status,
            "statusUpdatedAt": now.isoformat()
        }
    }

@router.get("/history")
async def get_history(
    userId: str = Depends(get_current_user_id)
):
    """
    Get all previous days' tracks grouped by date. Excludes today's date to focus on history.
    """
    utc_today, utc_now_time = get_current_date_and_time()
    
    # Fetch tracks before today
    cursor = db_service.db.daily_routine_track.find({
        "userId": userId,
        "date": {"$lt": utc_today}
    })
    tracks = await cursor.to_list(length=1000)
    
    # Group tracks by date
    history_dict = {}
    for t in tracks:
        date_str = t["date"]
        
        # In history, any Pending routine is considered "missed"
        is_missed = (t["status"] == "Pending")
        
        track_data = {
            "id": t["id"],
            "routineId": t["routineId"],
            "title": t["title"],
            "time": t["time"],
            "status": t["status"],
            "isMissed": is_missed,
            "reminderResponse": t.get("reminderResponse")
        }
        
        if date_str not in history_dict:
            history_dict[date_str] = []
        history_dict[date_str].append(track_data)
        
    # Sort the history items inside each date by time
    for d in history_dict:
        history_dict[d].sort(key=lambda x: x["time"])
        
    # Return sorted by date descending
    sorted_history = dict(sorted(history_dict.items(), key=lambda item: item[0], reverse=True))
    
    return {
        "success": True,
        "data": sorted_history
    }
