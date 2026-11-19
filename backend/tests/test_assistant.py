import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_assistant_and_verdict_flow():
    sess_key = f"test-guest-{uuid.uuid4().hex}"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. CSRF cookie
        csrf_res = await client.get("/sanctum/csrf-cookie")
        xsrf = csrf_res.cookies.get("XSRF-TOKEN")
        headers = {"X-XSRF-TOKEN": xsrf}

        # 2. Check quota (guest)
        quota_res = await client.get("/api/v1/assistant/quota", headers={"X-Session-Key": sess_key})
        assert quota_res.status_code == 200
        quota_data = quota_res.json()["data"]
        assert "limit" in quota_data
        assert "remaining" in quota_data

        # 3. Compare verdict
        prod_res = await client.get("/api/v1/products?category=smartphones&per_page=2")
        products = prod_res.json()["data"]
        p1 = products[0]["id"]
        p2 = products[1]["id"]

        verdict_res = await client.post(
            "/api/v1/compare/verdict",
            json={"product_ids": [p1, p2], "priority": "camera"},
            headers={"X-XSRF-TOKEN": xsrf, "X-Session-Key": sess_key},
        )
        assert verdict_res.status_code == 200
        v_data = verdict_res.json()["data"]
        assert "verdict" in v_data
        assert len(v_data["products"]) == 2

        # 4. Create conversation
        conv_res = await client.post(
            "/api/v1/assistant/conversations",
            json={"title": "Test Chat"},
            headers={"X-XSRF-TOKEN": xsrf, "X-Session-Key": sess_key},
        )
        assert conv_res.status_code == 201
        conv_id = conv_res.json()["data"]["id"]

        # 5. Send message
        msg_res = await client.post(
            f"/api/v1/assistant/conversations/{conv_id}/messages",
            json={"message": "Recommend a smartphone under 100000", "category": "smartphones", "budget_max": 100000},
            headers={"X-XSRF-TOKEN": xsrf, "X-Session-Key": sess_key},
        )
        assert msg_res.status_code == 201
        msg_data = msg_res.json()["data"]
        assert msg_data["role"] == "assistant"
        assert len(msg_data["content"]) > 0

        # 6. Get conversation detail
        get_conv = await client.get(
            f"/api/v1/assistant/conversations/{conv_id}",
            headers={"X-Session-Key": sess_key},
        )
        assert get_conv.status_code == 200
        messages = get_conv.json()["data"]["messages"]
        assert len(messages) >= 2  # user + assistant

        # 7. List conversations
        list_conv = await client.get(
            "/api/v1/assistant/conversations",
            headers={"X-Session-Key": sess_key},
        )
        assert list_conv.status_code == 200
        assert len(list_conv.json()["data"]) >= 1

        # 8. Delete conversation
        del_conv = await client.delete(
            f"/api/v1/assistant/conversations/{conv_id}",
            headers={"X-XSRF-TOKEN": xsrf, "X-Session-Key": sess_key},
        )
        assert del_conv.status_code == 204
