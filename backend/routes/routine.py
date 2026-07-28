from fastapi import APIRouter, Depends, Path, Query
from validators.schemas import RoutineCreateRequest, RoutineUpdateRequest, LogUpdateRequest
from middlewares.auth import get_current_user_id
from controllers.routine import (
    get_routines_controller,
    create_routine_controller,
    update_routine_controller,
    delete_routine_controller,
    get_dashboard_controller,
    update_log_controller,
    get_history_controller
)

# Standard regex to validate UUIDv4 route parameters
UUID_PATH_PATTERN = r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"

router = APIRouter()

@router.get("/routines")
async def get_routines(user_id: str = Depends(get_current_user_id)):
    return get_routines_controller(user_id)

@router.post("/routines")
async def create_routine(
    payload: RoutineCreateRequest,
    user_id: str = Depends(get_current_user_id)
):
    return create_routine_controller(user_id, payload)

@router.put("/routines/{id}")
async def update_routine(
    payload: RoutineUpdateRequest,
    id: str = Path(..., pattern=UUID_PATH_PATTERN),
    user_id: str = Depends(get_current_user_id)
):
    return update_routine_controller(user_id, id, payload)

@router.delete("/routines/{id}")
async def delete_routine(
    id: str = Path(..., pattern=UUID_PATH_PATTERN),
    user_id: str = Depends(get_current_user_id)
):
    return delete_routine_controller(user_id, id)

@router.get("/dashboard")
async def get_dashboard(
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    time: str = Query(..., pattern=r"^(0\d|1\d|2[0-3]):[0-5]\d$"),
    user_id: str = Depends(get_current_user_id)
):
    return get_dashboard_controller(user_id, date, time)

@router.post("/dashboard/complete")
async def update_log(
    payload: LogUpdateRequest,
    user_id: str = Depends(get_current_user_id)
):
    return update_log_controller(user_id, payload)

@router.get("/history")
async def get_history(
    startDate: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    endDate: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    user_id: str = Depends(get_current_user_id)
):
    return get_history_controller(user_id, startDate, endDate)
