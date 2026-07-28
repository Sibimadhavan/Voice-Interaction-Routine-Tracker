import os
import jwt
from datetime import datetime, timedelta
from config.db import redis_client
from repositories.user_repository import user_repository
from models.user import User
from services.twilio import twilio_service
from fastapi import HTTPException

JWT_SECRET = os.getenv("JWT_SECRET", "super_secret_jwt_key_123_abc")

class AuthService:
    def create_jwt_token(self, user_id: str) -> str:
        """Create a JWT token for user session"""
        payload = {
            "sub": user_id,
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

    def decode_jwt_token(self, token: str) -> str:
        """Decode a JWT token to get user_id"""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            return payload["sub"]
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Session expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid session token")

    def initiate_registration(self, phone: str):
        """Step 1: Check duplicate phone, generate digit, make Twilio call"""
        # Check if already registered
        existing = user_repository.get_by_phone(phone)
        if existing:
            raise HTTPException(status_code=400, detail="Mobile number is already registered")

        # Generate digit
        digit = twilio_service.generate_verification_digit()

        # Cache in Redis with 5 min TTL
        r = redis_client.get_client()
        r.setex(f"code:register:{phone}", 300, str(digit))
        r.delete(f"status:auth:{phone}")  # Clear any old status

        # Trigger Twilio Call
        success = twilio_service.initiate_verification_call(phone, digit)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to initiate verification call via Twilio")

        return {"verificationPending": True, "digit": digit}

    def initiate_login(self, phone: str):
        """Step 1: Verify phone is registered, generate digit, make Twilio call"""
        existing = user_repository.get_by_phone(phone)
        if not existing:
            raise HTTPException(status_code=404, detail="Mobile number is not registered")

        # Generate digit
        digit = twilio_service.generate_verification_digit()

        # Cache in Redis
        r = redis_client.get_client()
        r.setex(f"code:login:{phone}", 300, str(digit))
        r.delete(f"status:auth:{phone}")

        # Trigger Twilio Call
        success = twilio_service.initiate_verification_call(phone, digit)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to initiate verification call via Twilio")

        return {"verificationPending": True, "digit": digit}

    def check_verification_status(self, phone: str):
        """Poll status set by Twilio webhook to check if call keypress succeeded"""
        r = redis_client.get_client()
        status = r.get(f"status:auth:{phone}")

        if not status:
            return {"verified": False}

        # If verified, return verification success
        if status == "verified":
            # For login, we can return the JWT immediately
            existing_user = user_repository.get_by_phone(phone)
            if existing_user:
                # Login flow complete
                r.delete(f"status:auth:{phone}") # consume status
                token = self.create_jwt_token(existing_user["id"])
                return {
                    "verified": True,
                    "registered": True,
                    "token": token,
                    "user": {
                        "id": existing_user["id"],
                        "name": existing_user["name"],
                        "phone": existing_user["phone"]
                    }
                }
            else:
                # Registration flow: verified but not yet saved name
                # Keep verified status in Redis so that user can submit name next
                r.setex(f"register_verified:{phone}", 300, "1")
                r.delete(f"status:auth:{phone}") # consume status
                return {
                    "verified": True,
                    "registered": False
                }
        
        return {"verified": False}

    def complete_registration(self, phone: str, name: str):
        """Step 2 of registration: Save name and user after phone call completes"""
        r = redis_client.get_client()
        is_verified = r.get(f"register_verified:{phone}")
        if not is_verified:
            raise HTTPException(status_code=400, detail="Phone number verification is pending or expired")

        # Check duplicate again to be secure
        existing = user_repository.get_by_phone(phone)
        if existing:
            raise HTTPException(status_code=400, detail="Mobile number is already registered")

        # Create user
        new_user = User(name=name, phone=phone)
        saved_user = user_repository.create(new_user)

        # Clear register verification state
        r.delete(f"register_verified:{phone}")

        # Issue token
        token = self.create_jwt_token(saved_user["id"])
        return {
            "token": token,
            "user": {
                "id": saved_user["id"],
                "name": saved_user["name"],
                "phone": saved_user["phone"]
            }
        }

auth_service = AuthService()
