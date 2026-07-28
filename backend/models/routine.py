from pydantic import BaseModel, Field
from datetime import datetime
from uuid import uuid4

class Routine(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    userId: str = Field(..., description="UUID reference to user")
    title: str = Field(..., min_length=1, max_length=100)
    description: str = Field("", max_length=500)
    time: str = Field(..., pattern=r"^(0\d|1\d|2[0-3]):[0-5]\d$", description="HH:MM format, e.g., '08:30'")
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "id": "e4b9bbd2-f4ab-4b2a-bf39-df033b0069e2",
                "userId": "d7b9bbd2-f4ab-4b2a-bf39-df033b0069e1",
                "title": "Drink Water",
                "description": "2 glasses of water",
                "time": "08:30",
                "createdAt": "2026-07-28T12:00:00Z",
                "updatedAt": "2026-07-28T12:00:00Z"
            }
        }
