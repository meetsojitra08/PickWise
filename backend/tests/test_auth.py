import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_auth_full_flow():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # 1. Fetch CSRF cookie
        csrf_res = await client.get("/sanctum/csrf-cookie")
        assert csrf_res.status_code == 204
        xsrf_token = csrf_res.cookies.get("XSRF-TOKEN")
        assert xsrf_token is not None

        headers = {"X-XSRF-TOKEN": xsrf_token}

        # 2. Login with seeded demo user
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "customer@pickwise.test", "password": "password"},
            headers=headers,
        )
        print("LOGIN RES:", login_res.status_code, login_res.json())
        assert login_res.status_code == 200
        user_data = login_res.json()["data"]
        assert user_data["email"] == "customer@pickwise.test"
        assert user_data["role"] == "customer"

        # Update XSRF-TOKEN if refreshed
        if "XSRF-TOKEN" in client.cookies:
            headers["X-XSRF-TOKEN"] = client.cookies["XSRF-TOKEN"]

        # 3. GET /api/v1/auth/me
        me_res = await client.get("/api/v1/auth/me")
        assert me_res.status_code == 200
        assert me_res.json()["data"]["email"] == "customer@pickwise.test"

        # 4. PUT /api/v1/account/preferences
        pref_res = await client.put(
            "/api/v1/account/preferences",
            json={
                "budget_default": 200000,
                "favourite_categories": ["smartphones"],
                "priorities": ["camera"],
            },
            headers=headers,
        )
        assert pref_res.status_code == 200
        assert pref_res.json()["data"]["preferences"]["budget_default"] == 200000

        # 5. Logout
        logout_res = await client.post("/api/v1/auth/logout", headers=headers)
        assert logout_res.status_code == 200

        # 6. Verify me returns 401 after logout
        unauth_res = await client.get("/api/v1/auth/me")
        assert unauth_res.status_code == 401


@pytest.mark.asyncio
async def test_invalid_login():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.post(
            "/api/v1/auth/login",
            json={"email": "nonexistent@pickwise.test", "password": "wrong"},
        )
        assert res.status_code == 422
        data = res.json()
        assert "error" in data
        assert data["error"]["code"] == "validation_failed"
