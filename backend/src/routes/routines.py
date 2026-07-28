from fastapi import APIRouter, Depends, HTTPException, status
import uuid
from datetime import datetime
from src.services.db import db_service
from src.middlewares.auth import get_current_user_id
from src.validators.routines import RoutineCreateRequest, RoutineUpdateRequest

router = APIRouter(prefix="/routines", tags=["routines"])

@router.get("")
async def get_routines(userId: str = Depends(get_current_user_id)):
    """
    Get all active routine templates for the current user.
    """
    cursor = db_service.db.routine.find({"userId": userId, "isActive": True})
    routines = await cursor.to_list(length=100)
    
    # Format MongoDB _id and return data
    formatted_routines = []
    for r in routines:
        formatted_routines.append({
            "id": r["id"],
            "title": r["title"],
            "time": r["time"],
            "isActive": r["isActive"],
            "createdAt": r["createdAt"].isoformat() if isinstance(r.get("createdAt"), datetime) else r.get("createdAt"),
            "updatedAt": r["updatedAt"].isoformat() if isinstance(r.get("updatedAt"), datetime) else r.get("updatedAt")
        })
        
    return {
        "success": True,
        "data": formatted_routines
    }

@router.post("")
async def create_routine(payload: RoutineCreateRequest, userId: str = Depends(get_current_user_id)):
    """
    Create a new routine template. The change takes effect tomorrow onwards.
    """
    routine_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    routine_doc = {
        "id": routine_id,
        "userId": userId,
        "title": payload.title,
        "time": payload.time,
        "isActive": True,
        "createdAt": now,
        "updatedAt": now
    }
    
    await db_service.db.routine.insert_one(routine_doc)
    
    return {
        "success": True,
        "data": {
            "id": routine_id,
            "title": payload.title,
            "time": payload.time,
            "isActive": True
        }
    }

@router.put("/{routine_id}")
async def update_routine(routine_id: str, payload: RoutineUpdateRequest, userId: str = Depends(get_current_user_id)):
    """
    Update a routine template. The change takes effect tomorrow onwards.
    """
    # 1. Fetch routine and check ownership
    routine = await db_service.db.routine.find_one({"id": routine_id})
    if not routine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Routine template not found"
        )
        
    if routine["userId"] != userId:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this routine"
        )
        
    # 2. Update routine in DB
    now = datetime.utcnow()
    await db_service.db.routine.update_one(
        {"id": routine_id},
        {
            "$set": {
                "title": payload.title,
                "time": payload.time,
                "isActive": payload.isActive,
                "updatedAt": now
            }
        }
    )
    
    return {
        "success": True,
        "data": {
            "id": routine_id,
            "title": payload.title,
            "time": payload.time,
            "isActive": payload.isActive
        }
    }

@router.delete("/{routine_id}")
async def delete_routine(routine_id: str, userId: str = Depends(get_current_user_id)):
    """
    Soft delete a routine template (sets isActive = False).
    """
    # 1. Fetch routine and check ownership
    routine = await db_service.db.routine.find_one({"id": routine_id})
    if not routine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Routine template not found"
        )
        
    if routine["userId"] != userId:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this routine"
        )
        
    # 2. Soft delete (set isActive to False)
    now = datetime.utcnow()
    await db_service.db.routine.update_one(
        {"id": routine_id},
        {
            "$set": {
                "isActive": False,
                "updatedAt": now
            }
        }
    )
    
    return {
        "success": True,
        "message": "Routine template soft-deleted successfully"
    }
