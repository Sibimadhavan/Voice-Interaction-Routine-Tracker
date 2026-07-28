import os
import random
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Gather
from dotenv import load_dotenv

load_dotenv()

class TwilioService:
    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.phone_number = os.getenv("TWILIO_PHONE_NUMBER")
        self.webhook_url = os.getenv("TWIML_WEBHOOK_URL", "http://localhost:8000")
        self.client = None

    def connect(self):
        if self.account_sid and self.auth_token:
            try:
                self.client = Client(self.account_sid, self.auth_token)
                print("Connected to Twilio")
            except Exception as e:
                print(f"Error connecting to Twilio: {e}")
        else:
            print("Twilio credentials not configured")

    def generate_verification_digit(self) -> int:
        """Generate random single digit from 1-9"""
        return random.randint(1, 9)

    def initiate_verification_call(self, phone: str, digit: int) -> bool:
        """Initiate verification call with maximum duration rules"""
        if not self.client:
            print("Twilio client not initialized")
            return False
        try:
            # We pass parameters to dynamic TwiML builder webhook
            call = self.client.calls.create(
                to=phone,
                from_=self.phone_number,
                url=f"{self.webhook_url}/api/twilio/voice/auth?phone={phone}&expected={digit}",
                timeout=10  # Max ringing timeout to keep duration low
            )
            print(f"Verification call initiated: {call.sid}")
            return True
        except Exception as e:
            print(f"Error initiating call to {phone}: {e}")
            return False

    def initiate_reminder_call(self, phone: str, routine_id: str, date_str: str) -> bool:
        """Initiate routine reminder call to the user"""
        if not self.client:
            print("Twilio client not initialized")
            return False
        try:
            call = self.client.calls.create(
                to=phone,
                from_=self.phone_number,
                url=f"{self.webhook_url}/api/twilio/voice/reminder?phone={phone}&routineId={routine_id}&date={date_str}",
                timeout=10
            )
            print(f"Reminder call initiated: {call.sid} for routine {routine_id}")
            return True
        except Exception as e:
            print(f"Error initiating reminder call to {phone}: {e}")
            return False

    def get_auth_twiml(self, phone: str, expected_digit: int) -> str:
        """TwiML voice generation for auth DTMF keypad gather"""
        response = VoiceResponse()
        gather = Gather(
            num_digits=1,
            action=f"/api/twilio/voice/verify-auth?phone={phone}&expected={expected_digit}",
            method="POST",
            timeout=5
        )
        gather.say(f"Hello. This is your verification call. Please press {expected_digit} to log in.", voice="alice")
        response.append(gather)
        # Hang up if no digit pressed
        response.say("We did not receive any keypress. Goodbye.", voice="alice")
        response.hangup()
        return str(response)

    def get_reminder_twiml(self, phone: str, routine_id: str, date_str: str) -> str:
        """TwiML voice generation for routine reminder checklist gather"""
        response = VoiceResponse()
        gather = Gather(
            num_digits=1,
            action=f"/api/twilio/voice/verify-reminder?phone={phone}&routineId={routine_id}&date={date_str}",
            method="POST",
            timeout=5
        )
        gather.say(
            "This is a reminder for your pending routine. "
            "Please press 1 if completed. Press 0 if not completed. Press 2 if you will complete it later.",
            voice="alice"
        )
        response.append(gather)
        response.say("We did not receive any keypress. Goodbye.", voice="alice")
        response.hangup()
        return str(response)

twilio_service = TwilioService()
