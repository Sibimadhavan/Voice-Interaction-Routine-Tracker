from fastapi import HTTPException
from validators.schemas import RegisterRequest, LoginRequest, CompleteRegistrationRequest
from services.auth import auth_service

def initiate_register_controller(payload: RegisterRequest):
    result = auth_service.initiate_registration(payload.phone)
    return {"success": True, "data": result}

def initiate_login_controller(payload: LoginRequest):
    result = auth_service.initiate_login(payload.phone)
    return {"success": True, "data": result}

def check_verification_controller(phone: str):
    result = auth_service.check_verification_status(phone)
    return {"success": True, "data": result}

def complete_register_controller(payload: CompleteRegistrationRequest):
    result = auth_service.complete_registration(payload.phone, payload.name)
    return {"success": True, "data": result}
