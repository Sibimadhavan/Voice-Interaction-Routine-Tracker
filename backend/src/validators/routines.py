from pydantic import BaseModel, Field, field_validator
import re

class RoutineCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    time: str = Field(..., description="Scheduled time in HH:MM format (24h)")

    @field_validator("time")
    @classmethod
    def validate_time(cls, v: str) -> str:
        time = v.strip()
        if not re.match(r"^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$", time):
            raise ValueError("Time must be in 24-hour format HH:MM, e.g., 08:30 or 21:00")
        return time

class RoutineUpdateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    time: str = Field(..., description="Scheduled time in HH:MM format (24h)")
    isActive: bool = True

    @field_validator("time")
    @classmethod
    def validate_time(cls, v: str) -> str:
        time = v.strip()
        if not re.match(r"^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$", time):
            raise ValueError("Time must be in 24-hour format HH:MM, e.g., 08:30 or 21:00")
        return time

class TrackStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="Status must be one of: Pending, Completed, Will Complete Later")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        status = v.strip()
        allowed = ["Pending", "Completed", "Will Complete Later"]
        if status not in allowed:
            raise ValueError(f"Status must be one of {allowed}")
        return status
