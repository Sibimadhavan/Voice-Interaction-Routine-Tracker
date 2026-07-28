from fastapi import APIRouter, HTTPException, status, Depends, Header
import random
import uuid
from datetime import datetime
from src.services.db import db_service
from src.services.twilio_service import twilio_service
from src.validators.auth import PhoneAuthStartRequest, RegisterCompleteRequest, LoginCompleteRequest
from src.middlewares.auth import get_current_user_id

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register/start")
async def register_start(payload: PhoneAuthStartRequest):
    phone = payload.phone
    
    # 1. Check if user already exists
    user = await db_service.db.user.find_one({"phone": phone})
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number is already registered"
        )
        
    # 2. Generate random digit from 1-9
    digit = random.randint(1, 9)
    
    # 3. Store in Redis with 5 min expiry
    otp_key = f"otp:{phone}"
    await db_service.redis_client.setex(otp_key, 300, str(digit))
    
    # 4. Initiate Twilio verification call
    try:
        await twilio_service.initiate_verification_call(phone)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Twilio call failed: {str(e)}"
        )
        
    return {
        "success": True,
        "data": {
            "digit": digit
        }
    }

@router.post("/register/complete")
async def register_complete(payload: RegisterCompleteRequest):
    phone = payload.phone
    name = payload.name.strip()
    
    # 1. Check if the verification is completed in Redis
    verify_key = f"verified_registration:{phone}"
    is_verified = await db_service.redis_client.get(verify_key)
    
    # If in MOCK mode, allow bypass if they use the correct digit or just verify
    if not is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number not verified. Please complete the verification call first."
        )
        
    # 2. Check duplicate phone again (to prevent race conditions)
    existing_user = await db_service.db.user.find_one({"phone": phone})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number is already registered"
        )
        
    # 3. Create User in MongoDB
    user_id = str(uuid.uuid4())
    now = datetime.utcnow()
    user_doc = {
        "id": user_id,
        "phone": phone,
        "name": name,
        "createdAt": now,
        "updatedAt": now
    }
    await db_service.db.user.insert_one(user_doc)
    
    # 4. Cleanup Redis verification key
    await db_service.redis_client.delete(verify_key)
    
    # 5. Generate session token
    session_token = str(uuid.uuid4())
    await db_service.redis_client.setex(f"session:{session_token}", 86400, user_id)
    
    return {
        "success": True,
        "data": {
            "token": session_token,
            "user": {
                "id": user_id,
                "phone": phone,
                "name": name
            }
        }
    }

@router.post("/login/start")
async def login_start(payload: PhoneAuthStartRequest):
    phone = payload.phone
    
    # 1. Check if user is registered
    user = await db_service.db.user.find_one({"phone": phone})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number is not registered"
        )
        
    # 2. Generate random digit from 1-9
    digit = random.randint(1, 9)
    
    # 3. Store in Redis (TTL 300s)
    otp_key = f"otp:{phone}"
    await db_service.redis_client.setex(otp_key, 300, str(digit))
    
    # 4. Initiate Twilio call
    try:
        await twilio_service.initiate_verification_call(phone)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Twilio call failed: {str(e)}"
        )
        
    return {
        "success": True,
        "data": {
            "digit": digit
        }
    }

@router.post("/login/complete")
async def login_complete(payload: LoginCompleteRequest):
    phone = payload.phone
    
    # 1. Check verification key
    verify_key = f"verified_login:{phone}"
    is_verified = await db_service.redis_client.get(verify_key)
    
    if not is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number not verified. Please complete the verification call first."
        )
        
    # 2. Get User from MongoDB
    user = await db_service.db.user.find_one({"phone": phone})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    # 3. Cleanup Redis verification key
    await db_service.redis_client.delete(verify_key)
    
    # 4. Generate session token
    session_token = str(uuid.uuid4())
    await db_service.redis_client.setex(f"session:{session_token}", 86400, user["id"])
    
    return {
        "success": True,
        "data": {
            "token": session_token,
            "user": {
                "id": user["id"],
                "phone": user["phone"],
                "name": user["name"]
            }
        }
    }

@router.post("/logout")
async def logout(authorization: str = Depends(get_current_user_id)):
    # The authorization dependency extracts the userId, but we need the raw header to delete the session
    # We can fetch the raw token directly or pass it, but since get_current_user_id validates it, 
    # we can intercept the token or parse it from headers
    pass

# We redefine logout to take the token manually to make deletion simple
@router.post("/logout-user")
async def logout_user(authorization: str = Header(...)):
    if authorization.startswith("Bearer "):
        token = authorization.split(" ")[1].strip()
        await db_service.redis_client.delete(f"session:{token}")
    return {"success": True}

@router.get("/status")
async def get_verification_status(phone: str, mode: str):
    if mode == "register":
        verified = await db_service.redis_client.get(f"verified_registration:{phone}")
    else:
        verified = await db_service.redis_client.get(f"verified_login:{phone}")
    
    return {
        "success": True,
        "data": {
            "verified": verified == "true"
        }
    }
