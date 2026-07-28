from fastapi import APIRouter, Form, Query
from controllers.twilio import (
    voice_auth_controller,
    verify_auth_controller,
    voice_reminder_controller,
    verify_reminder_controller
)

router = APIRouter()

@router.post("/voice/auth")
async def voice_auth(
    phone: str = Query(...),
    expected: str = Query(...)
):
    return voice_auth_controller(phone, expected)

@router.post("/voice/verify-auth")
async def verify_auth(
    phone: str = Query(...),
    expected: str = Query(...),
    Digits: str = Form(None)
):
    return verify_auth_controller(phone, expected, Digits)

@router.post("/voice/reminder")
async def voice_reminder(
    phone: str = Query(...),
    routineId: str = Query(...),
    date: str = Query(...)
):
    return voice_reminder_controller(phone, routineId, date)

@router.post("/voice/verify-reminder")
async def verify_reminder(
    phone: str = Query(...),
    routineId: str = Query(...),
    date: str = Query(...),
    Digits: str = Form(None)
):
    return verify_reminder_controller(phone, routineId, date, Digits)
