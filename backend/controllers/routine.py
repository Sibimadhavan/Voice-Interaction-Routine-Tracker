from datetime import datetime
from fastapi import Query
from validators.schemas import RoutineCreateRequest, RoutineUpdateRequest, LogUpdateRequest
from services.routine import routine_service

def get_routines_controller(user_id: str):
    routines = routine_service.get_user_routines(user_id)
    # Map _id or other internal DB values if needed
    for r in routines:
        r["id"] = r.get("id")
    return {"success": True, "data": routines}

def create_routine_controller(user_id: str, payload: RoutineCreateRequest):
    new_routine = routine_service.create_routine(
        user_id=user_id,
        title=payload.title,
        description=payload.description,
        time=payload.time
    )
    return {"success": True, "data": {"id": new_routine["id"], "title": new_routine["title"]}}

def update_routine_controller(user_id: str, routine_id: str, payload: RoutineUpdateRequest):
    updated = routine_service.update_routine(
        user_id=user_id,
        routine_id=routine_id,
        title=payload.title,
        description=payload.description,
        time=payload.time
    )
    return {"success": True, "data": {"id": updated["id"], "title": updated["title"]}}

def delete_routine_controller(user_id: str, routine_id: str):
    routine_service.delete_routine(user_id, routine_id)
    return {"success": True, "data": {"id": routine_id, "message": "Routine deleted successfully"}}

def get_dashboard_controller(user_id: str, date_str: str, current_time: str):
    checklist = routine_service.get_or_create_today_checklist(user_id, date_str, current_time)
    return {"success": True, "data": checklist}

def update_log_controller(user_id: str, payload: LogUpdateRequest):
    log = routine_service.update_log_status(
        user_id=user_id,
        routine_id=payload.routineId,
        date_str=payload.date,
        status=payload.status
    )
    return {"success": True, "data": {"routineId": log["routineId"], "status": log["status"]}}

def get_history_controller(user_id: str, start_date: str, end_date: str):
    history = routine_service.get_user_history(user_id, start_date, end_date)
    return {"success": True, "data": history}
