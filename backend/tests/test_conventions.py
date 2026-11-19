import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_health_check_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/health")
        # In test environment, DB or Redis might be offline if containers aren't running locally,
        # but the response envelope MUST match conventions.
        data = response.json()
        if response.status_code == 200:
            assert "data" in data
            assert data["data"]["status"] == "ok"
        else:
            assert response.status_code == 503
            assert "error" in data
            assert data["error"]["code"] == "service_unavailable"


@pytest.mark.asyncio
async def test_request_id_middleware():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        custom_id = "custom-uuid-12345"
        response = await client.get("/api/v1/health", headers={"X-Request-Id": custom_id})
        assert response.headers.get("X-Request-Id") == custom_id


@pytest.mark.asyncio
async def test_sanctum_csrf_cookie_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/sanctum/csrf-cookie")
        assert response.status_code == 204
        assert "XSRF-TOKEN" in response.cookies


@pytest.mark.asyncio
async def test_not_found_error_envelope():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/non-existent-route")
        assert response.status_code == 404
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "not_found"
