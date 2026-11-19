from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db, get_redis_client

router = APIRouter()


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    database_ok = False
    redis_ok = False

    # Check PostgreSQL
    try:
        res = await db.execute(text("SELECT 1"))
        if res.scalar() == 1:
            database_ok = True
    except Exception:
        database_ok = False

    # Check Redis
    try:
        redis = get_redis_client()
        pong = await redis.ping()
        if pong:
            redis_ok = True
    except Exception:
        redis_ok = False

    is_healthy = database_ok and redis_ok

    if not is_healthy:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "error": {
                    "code": "service_unavailable",
                    "message": "One or more dependencies are unavailable.",
                    "details": {
                        "database": "ok" if database_ok else "error",
                        "redis": "ok" if redis_ok else "error",
                    },
                }
            },
        )

    return {
        "data": {
            "status": "ok",
            "database": "ok",
            "redis": "ok",
        }
    }
