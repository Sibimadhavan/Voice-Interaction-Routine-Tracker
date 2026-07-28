from pydantic import BaseModel, Field
from typing import Optional

# Pattern to enforce UUIDv4: e.g. e4b9bbd2-f4ab-4b2a-bf39-df033b0069e2
UUID_PATTERN = r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
# Phone in E.164 format: e.g. +14632704532
PHONE_PATTERN = r"^\+?[1-9]\d{1,14}$"
# Time in HH:MM format: e.g. 08:30
TIME_PATTERN = r"^(0\d|1\d|2[0-3]):[0-5]\d$"

class RegisterRequest(BaseModel):
    phone: str = Field(..., pattern=PHONE_PATTERN, description="Mobile number in E.164 format")

class LoginRequest(BaseModel):
    phone: str = Field(..., pattern=PHONE_PATTERN, description="Mobile number in E.164 format")

class CompleteRegistrationRequest(BaseModel):
    phone: str = Field(..., pattern=PHONE_PATTERN)
    name: str = Field(..., min_length=1, max_length=100)

class RoutineCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field("", max_length=500)
    time: str = Field(..., pattern=TIME_PATTERN)

class RoutineUpdateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field("", max_length=500)
    time: str = Field(..., pattern=TIME_PATTERN)

class LogUpdateRequest(BaseModel):
    routineId: str = Field(..., pattern=UUID_PATTERN)
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    status: str = Field(..., pattern=r"^(completed|pending|later)$")
