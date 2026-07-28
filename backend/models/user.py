from pydantic import BaseModel, Field
from datetime import datetime
from uuid import uuid4

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., pattern=r"^\+?[1-9]\d{1,14}$")
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "id": "e4b9bbd2-f4ab-4b2a-bf39-df033b0069e2",
                "name": "John Doe",
                "phone": "+14632704532",
                "createdAt": "2026-07-28T12:00:00Z",
                "updatedAt": "2026-07-28T12:00:00Z"
            }
        }
