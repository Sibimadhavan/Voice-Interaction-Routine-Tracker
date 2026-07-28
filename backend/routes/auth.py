from fastapi import APIRouter, Depends, Query
from validators.schemas import RegisterRequest, LoginRequest, CompleteRegistrationRequest
from controllers.auth import (
    initiate_register_controller,
    initiate_login_controller,
    check_verification_controller,
    complete_register_controller
)
from middlewares.rate_limit import rate_limiter

router = APIRouter()

@router.post("/register", dependencies=[Depends(rate_limiter)])
async def register(payload: RegisterRequest):
    return initiate_register_controller(payload)

@router.post("/login", dependencies=[Depends(rate_limiter)])
async def login(payload: LoginRequest):
    return initiate_login_controller(payload)

@router.get("/verify")
async def verify(phone: str = Query(..., pattern=r"^\+?[1-9]\d{1,14}$")):
    return check_verification_controller(phone)

@router.post("/complete-registration")
async def complete_registration(payload: CompleteRegistrationRequest):
    return complete_register_controller(payload)
