from pydantic import BaseModel, Field
from datetime import datetime
from uuid import uuid4

class Log(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    routineId: str = Field(..., description="UUID reference to routine")
    userId: str = Field(..., description="UUID reference to user")
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD format")
    status: str = Field(..., pattern=r"^(completed|pending|later)$", description="completed, pending, or later")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "id": "e4b9bbd2-f4ab-4b2a-bf39-df033b0069e2",
                "routineId": "d7b9bbd2-f4ab-4b2a-bf39-df033b0069e1",
                "userId": "a7b9bbd2-f4ab-4b2a-bf39-df033b0069e0",
                "date": "2026-07-28",
                "status": "completed",
                "timestamp": "2026-07-28T12:05:00Z",
                "createdAt": "2026-07-28T12:05:00Z",
                "updatedAt": "2026-07-28T12:05:00Z"
            }
        }
