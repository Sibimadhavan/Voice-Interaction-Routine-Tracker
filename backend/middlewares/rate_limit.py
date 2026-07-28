from fastapi import Request, HTTPException
from config.db import redis_client

async def rate_limiter(request: Request):
    """
    Enforce rate limiting on authentication routes (max 5 requests per minute per IP)
    backed by Redis cache for distributed rate tracking.
    """
    r = redis_client.get_client()
    if not r:
        # Graceful degradation if Redis is down
        return

    client_ip = request.client.host
    path = request.url.path
    key = f"rate_limit:{path}:{client_ip}"

    # Check key rate count
    count = r.get(key)
    if count and int(count) >= 5:
        raise HTTPException(
            status_code=429,
            detail="Too many authentication attempts. Please retry after 1 minute."
        )

    # Increment and set TTL if new
    pipe = r.pipeline()
    pipe.incr(key)
    if not count:
        pipe.expire(key, 60)
    pipe.execute()
