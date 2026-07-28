from pydantic import BaseModel, Field, field_validator
import re

class PhoneAuthStartRequest(BaseModel):
    phone: str = Field(..., description="E.164 phone number, e.g. +1234567890")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        # Normalize phone
        phone = v.strip()
        # Twilio prefers E.164 format: + followed by 10 to 15 digits
        if not re.match(r"^\+[1-9]\d{1,14}$", phone):
            raise ValueError("Phone number must be in E.164 format, starting with '+' followed by country code and digits (e.g., +1234567890)")
        return phone

class RegisterCompleteRequest(BaseModel):
    phone: str = Field(..., description="E.164 phone number, e.g. +1234567890")
    name: str = Field(..., min_length=2, max_length=50)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        phone = v.strip()
        if not re.match(r"^\+[1-9]\d{1,14}$", phone):
            raise ValueError("Phone number must be in E.164 format (e.g., +1234567890)")
        return phone

class LoginCompleteRequest(BaseModel):
    phone: str = Field(..., description="E.164 phone number, e.g. +1234567890")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        phone = v.strip()
        if not re.match(r"^\+[1-9]\d{1,14}$", phone):
            raise ValueError("Phone number must be in E.164 format (e.g., +1234567890)")
        return phone
