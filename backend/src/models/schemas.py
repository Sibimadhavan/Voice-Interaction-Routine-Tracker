from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict
from uuid import UUID

class UserModel(BaseModel):
    id: str = Field(..., description="UUID as string")
    phone: str
    name: str
    createdAt: datetime
    updatedAt: datetime

class RoutineModel(BaseModel):
    id: str = Field(..., description="UUID as string")
    userId: str
    title: str
    time: str  # HH:MM format
    isActive: bool = True
    createdAt: datetime
    updatedAt: datetime

class DailyRoutineTrackModel(BaseModel):
    id: str = Field(..., description="UUID as string")
    userId: str
    routineId: str
    date: str  # YYYY-MM-DD
    title: str
    time: str  # HH:MM
    status: str  # "Pending" | "Completed" | "Will Complete Later"
    statusUpdatedAt: datetime
    reminderCalled: bool = False
    reminderResponse: Optional[str] = None
    reminderResponseAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime
