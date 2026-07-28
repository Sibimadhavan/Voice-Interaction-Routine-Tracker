from fastapi import Header, HTTPException, status, Depends
from src.services.db import db_service

async def get_current_user_id(authorization: str = Header(..., description="Bearer <session_token>")) -> str:
    """
    FastAPI dependency to authenticate requests using the session token in Redis.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Must start with 'Bearer '"
        )
    
    token = authorization.split(" ")[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token missing"
        )
        
    # Retrieve user ID from Redis
    if not db_service.redis_client:
        # Fallback if DB connections aren't initialized yet
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database service not initialized"
        )
        
    session_key = f"session:{token}"
    user_id = await db_service.redis_client.get(session_key)
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token"
        )
        
    return user_id
