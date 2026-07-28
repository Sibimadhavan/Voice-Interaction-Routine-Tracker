from fastapi import APIRouter, Form, Query, Response, status
from typing import Optional
from datetime import datetime
import urllib.parse
from src.services.db import db_service
from src.config.settings import settings

router = APIRouter(prefix="/webhooks/twilio", tags=["twilio-webhooks"])

def twiml_response(xml_content: str) -> Response:
    """
    Helper to wrap TwiML XML string in a FastAPI Response with appropriate media type.
    """
    xml_str = f'<?xml version="1.0" encoding="UTF-8"?><Response>{xml_content}</Response>'
    return Response(content=xml_str, media_type="application/xml")

@router.post("/verification-call")
async def twilio_verification_call(phone: str):
    """
    TwiML webhook when Twilio call is answered.
    Prompts the user to enter the digit displayed on the screen.
    """
    encoded_phone = urllib.parse.quote(phone)
    action_url = f"{settings.public_url.rstrip('/')}/api/webhooks/twilio/verify-digit?phone={encoded_phone}"
    
    xml = f"""
    <Gather numDigits="1" action="{action_url}" timeout="8" method="POST">
        <Say voice="alice">Please enter the single digit displayed on your screen to complete verification.</Say>
    </Gather>
    <Say voice="alice">We did not receive any input. Goodbye.</Say>
    <Hangup/>
    """
    return twiml_response(xml)

@router.post("/verify-digit")
async def twilio_verify_digit(
    phone: str,
    Digits: Optional[str] = Form(None)
):
    """
    TwiML webhook to verify the user-pressed digit.
    Saves success state to Redis.
    """
    # Normalize phone number (handle URL decode space issues where '+' becomes ' ')
    phone = phone.strip()
    if not phone.startswith("+"):
        if phone.startswith(" "):
            phone = "+" + phone.lstrip()
        else:
            phone = "+" + phone
            
    otp_key = f"otp:{phone}"
    stored_digit = await db_service.redis_client.get(otp_key)
    
    if not Digits:
        xml = "<Say voice='alice'>No input received. Verification failed. Goodbye.</Say><Hangup/>"
        return twiml_response(xml)
        
    if not stored_digit:
        xml = "<Say voice='alice'>Verification session expired. Please try again. Goodbye.</Say><Hangup/>"
        return twiml_response(xml)

    if Digits.strip() == stored_digit.strip():
        # Complete verification
        # 1. Determine if registering or logging in
        user = await db_service.db.user.find_one({"phone": phone})
        if user:
            # Login verification
            verify_key = f"verified_login:{phone}"
        else:
            # Registration verification
            verify_key = f"verified_registration:{phone}"
            
        await db_service.redis_client.setex(verify_key, 600, "true")
        await db_service.redis_client.delete(otp_key)
        
        xml = "<Say voice='alice'>Verification successful. Thank you! Goodbye.</Say><Hangup/>"
    else:
        xml = "<Say voice='alice'>Incorrect digit entered. Verification failed. Goodbye.</Say><Hangup/>"
        
    return twiml_response(xml)

@router.post("/reminder-call")
async def twilio_reminder_call(trackId: str):
    """
    TwiML webhook when reminder call is answered.
    Prompts the user to respond to routine status.
    """
    track = await db_service.db.daily_routine_track.find_one({"id": trackId})
    if not track:
        xml = "<Say voice='alice'>Error. Routine not found. Goodbye.</Say><Hangup/>"
        return twiml_response(xml)
        
    title = track["title"]
    action_url = f"{settings.public_url.rstrip('/')}/api/webhooks/twilio/verify-reminder?trackId={trackId}"
    
    xml = f"""
    <Gather numDigits="1" action="{action_url}" timeout="8" method="POST">
        <Say voice="alice">This is a reminder for your routine: {title}. Press 1 if completed. Press 0 if not completed. Press 2 to complete later.</Say>
    </Gather>
    <Say voice="alice">We did not receive any input. Goodbye.</Say>
    <Hangup/>
    """
    return twiml_response(xml)

@router.post("/verify-reminder")
async def twilio_verify_reminder(
    trackId: str,
    Digits: Optional[str] = Form(None)
):
    """
    TwiML webhook to process user response (1, 0, or 2) and update MongoDB.
    """
    track = await db_service.db.daily_routine_track.find_one({"id": trackId})
    if not track:
        xml = "<Say voice='alice'>Error. Routine not found. Goodbye.</Say><Hangup/>"
        return twiml_response(xml)
        
    if not Digits:
        xml = "<Say voice='alice'>No input received. Goodbye.</Say><Hangup/>"
        return twiml_response(xml)
        
    digit = Digits.strip()
    status_mapping = {
        "1": "Completed",
        "0": "Pending",
        "2": "Will Complete Later"
    }
    
    if digit in status_mapping:
        new_status = status_mapping[digit]
        now = datetime.utcnow()
        
        await db_service.db.daily_routine_track.update_one(
            {"id": trackId},
            {
                "$set": {
                    "status": new_status,
                    "reminderResponse": digit,
                    "reminderResponseAt": now,
                    "statusUpdatedAt": now,
                    "updatedAt": now
                }
            }
        )
        
        message_mapping = {
            "1": "Routine marked as completed. Well done!",
            "0": "Routine kept as pending. Don't forget to complete it.",
            "2": "Routine marked as will complete later. We will remind you later."
        }
        
        xml = f"<Say voice='alice'>{message_mapping[digit]} Goodbye.</Say><Hangup/>"
    else:
        xml = "<Say voice='alice'>Invalid option selected. Goodbye.</Say><Hangup/>"
        
    return twiml_response(xml)
