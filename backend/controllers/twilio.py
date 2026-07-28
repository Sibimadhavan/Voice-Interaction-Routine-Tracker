from fastapi import Response, Form, HTTPException
from twilio.twiml.voice_response import VoiceResponse
from config.db import redis_client
from repositories.log_repository import log_repository
from repositories.routine_repository import routine_repository
from models.log import Log

def voice_auth_controller(phone: str, expected: str):
    """Generate TwiML to gather digit verification from user"""
    from services.twilio import twilio_service
    twiml = twilio_service.get_auth_twiml(phone, int(expected))
    return Response(content=twiml, media_type="application/xml")

def verify_auth_controller(phone: str, expected: str, digits: str = Form(None)):
    """Webhook callback to evaluate if the pressed digit matches expected"""
    response = VoiceResponse()
    r = redis_client.get_client()

    if digits and digits == expected:
        # Save verified status to Redis
        r.setex(f"status:auth:{phone}", 300, "verified")
        response.say("Verification successful. Thank you. Goodbye.", voice="alice")
    else:
        # Save failure/clear verification
        r.delete(f"status:auth:{phone}")
        response.say("Verification failed. Incorrect digit pressed. Goodbye.", voice="alice")

    response.hangup()
    return Response(content=str(response), media_type="application/xml")

def voice_reminder_controller(phone: str, routine_id: str, date: str):
    """Generate TwiML for pending routine alert with keypad options"""
    from services.twilio import twilio_service
    twiml = twilio_service.get_reminder_twiml(phone, routine_id, date)
    return Response(content=twiml, media_type="application/xml")

def verify_reminder_controller(phone: str, routine_id: str, date: str, digits: str = Form(None)):
    """Webhook callback to handle keypress on routine checklist phone call"""
    response = VoiceResponse()
    
    # Verify the routine exists to get the owner user id
    routine = routine_repository.get_by_id(routine_id)
    if not routine:
        response.say("Error: Routine not found. Goodbye.", voice="alice")
        response.hangup()
        return Response(content=str(response), media_type="application/xml")

    # Match keypad options
    status = None
    message = ""
    if digits == "1":
        status = "completed"
        message = "Routine marked as completed. Thank you."
    elif digits == "0":
        status = "pending"
        message = "Routine kept as pending."
    elif digits == "2":
        status = "later"
        message = "Routine marked as complete later."
    else:
        # Invalid input, hangup
        response.say("Invalid option. Goodbye.", voice="alice")
        response.hangup()
        return Response(content=str(response), media_type="application/xml")

    # Update MongoDB logs
    log_doc = Log(
        routineId=routine_id,
        userId=routine["userId"],
        date=date,
        status=status
    )
    log_repository.create_or_update(log_doc)

    response.say(message, voice="alice")
    response.hangup()
    return Response(content=str(response), media_type="application/xml")
