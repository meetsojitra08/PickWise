import pytest
from app.db.session import close_redis_client, engine


@pytest.fixture(autouse=True)
async def cleanup_connections():
    yield
    await engine.dispose()
    await close_redis_client()
