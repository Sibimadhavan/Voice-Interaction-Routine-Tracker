from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.auth import auth_service

# Define bearer token extractor
reusable_oauth2 = HTTPBearer()

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(reusable_oauth2)) -> str:
    """Dependency to check JWT auth headers and return the authorized User UUID"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    token = credentials.credentials
    user_id = auth_service.decode_jwt_token(token)
    return user_id
