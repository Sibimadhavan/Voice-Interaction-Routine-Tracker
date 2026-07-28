import logging
from twilio.rest import Client
from src.config.settings import settings

logger = logging.getLogger(__name__)

class TwilioService:
    def __init__(self):
        self.enabled = False
        self.client = None
        
        sid = settings.twilio_account_sid.strip()
        token = settings.twilio_auth_token.strip()
        self.from_phone = settings.twilio_phone_number.strip()
        
        if sid and token and self.from_phone:
            try:
                self.client = Client(sid, token)
                self.enabled = True
                logger.info("Twilio client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {e}")
        else:
            logger.warning(
                "Twilio credentials (ACCOUNT_SID, AUTH_TOKEN, PHONE_NUMBER) are incomplete. "
                "The server will run in MOCK mode for outbound calling."
            )

    async def initiate_verification_call(self, phone: str):
        """
        Initiates a call to verification-call webhook.
        The call will have a maximum duration limit of 10 seconds.
        """
        webhook_url = f"{settings.public_url.rstrip('/')}/api/webhooks/twilio/verification-call?phone={phone}"
        logger.info(f"Initiating verification call to {phone} using webhook: {webhook_url}")
        
        if self.enabled:
            try:
                # Run synchronous Twilio call in threadpool or run directly since it is brief
                call = self.client.calls.create(
                    to=phone,
                    from_=self.from_phone,
                    url=webhook_url,
                    time_limit=10,  # Max call duration 10 seconds
                    method="POST"
                )
                logger.info(f"Twilio call initiated. SID: {call.sid}")
                return call.sid
            except Exception as e:
                logger.error(f"Twilio call failed: {e}")
                raise RuntimeError(f"Failed to initiate Twilio verification call: {e}")
        else:
            logger.info(f"[MOCK TWILIO CALL] Outbound verification call to {phone} triggered. Simulating callback at: {webhook_url}")
            return "mock_verification_call_sid"

    async def initiate_reminder_call(self, phone: str, track_id: str, title: str):
        """
        Initiates a routine reminder call to the user.
        The call will have a maximum duration limit of 10 seconds.
        """
        webhook_url = f"{settings.public_url.rstrip('/')}/api/webhooks/twilio/reminder-call?trackId={track_id}"
        logger.info(f"Initiating routine reminder call to {phone} for '{title}' using webhook: {webhook_url}")
        
        if self.enabled:
            try:
                call = self.client.calls.create(
                    to=phone,
                    from_=self.from_phone,
                    url=webhook_url,
                    time_limit=10,  # Max call duration 10 seconds
                    method="POST"
                )
                logger.info(f"Twilio reminder call initiated. SID: {call.sid}")
                return call.sid
            except Exception as e:
                logger.error(f"Twilio reminder call failed: {e}")
                raise RuntimeError(f"Failed to initiate Twilio reminder call: {e}")
        else:
            logger.info(f"[MOCK TWILIO CALL] Outbound reminder call to {phone} for routine '{title}' triggered. Simulating callback at: {webhook_url}")
            return "mock_reminder_call_sid"

twilio_service = TwilioService()
