import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_admin_access_control():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Unauthenticated
        res = await client.get("/api/v1/admin/dashboard")
        assert res.status_code == 401

        # Login as customer
        csrf = (await client.get("/sanctum/csrf-cookie")).cookies.get("XSRF-TOKEN")
        await client.post(
            "/api/v1/auth/login",
            json={"email": "customer@pickwise.test", "password": "password"},
            headers={"X-XSRF-TOKEN": csrf},
        )
        # Forbidden for customer
        res = await client.get("/api/v1/admin/dashboard")
        assert res.status_code == 403


@pytest.mark.asyncio
async def test_admin_full_flow():
    rand_suffix = uuid.uuid4().hex[:6]
    cat_name = f"Gaming-{rand_suffix}"
    spec_key = f"rate_{rand_suffix}"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. CSRF
        csrf_res = await client.get("/sanctum/csrf-cookie")
        xsrf = csrf_res.cookies.get("XSRF-TOKEN")

        # 2. Login as admin
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@pickwise.test", "password": "password"},
            headers={"X-XSRF-TOKEN": xsrf},
        )
        assert login_res.status_code == 200
        assert login_res.json()["data"]["role"] == "admin"
        xsrf = client.cookies.get("XSRF-TOKEN") or xsrf
        headers = {"X-XSRF-TOKEN": xsrf}

        # 3. Dashboard
        dash_res = await client.get("/api/v1/admin/dashboard")
        assert dash_res.status_code == 200
        dash_data = dash_res.json()["data"]
        assert "counts" in dash_data
        assert dash_data["counts"]["products"]["total"] >= 60

        # 4. Categories CRUD
        cat_list = await client.get("/api/v1/admin/categories")
        assert cat_list.status_code == 200
        assert len(cat_list.json()["data"]) >= 6

        cat_create = await client.post(
            "/api/v1/admin/categories",
            json={"name": cat_name, "sort_order": 10, "is_active": True},
            headers=headers,
        )
        assert cat_create.status_code == 201
        new_cat_id = cat_create.json()["data"]["id"]

        cat_update = await client.patch(
            f"/api/v1/admin/categories/{new_cat_id}",
            json={"description": "High performance gear"},
            headers=headers,
        )
        assert cat_update.status_code == 200
        assert cat_update.json()["data"]["description"] == "High performance gear"

        # 5. Category Specs CRUD
        spec_create = await client.post(
            f"/api/v1/admin/categories/{new_cat_id}/specs",
            json={
                "key": spec_key,
                "label": "Polling Rate",
                "unit": "Hz",
                "data_type": "number",
                "is_filterable": True,
                "is_comparable": True,
                "higher_is_better": True,
                "sort_order": 1,
            },
            headers=headers,
        )
        assert spec_create.status_code == 201

        specs_list = await client.get(f"/api/v1/admin/categories/{new_cat_id}/specs")
        assert specs_list.status_code == 200
        assert len(specs_list.json()["data"]) == 1

        # 6. Brands
        brands_res = await client.get("/api/v1/admin/brands")
        assert brands_res.status_code == 200
        assert len(brands_res.json()["data"]) >= 20

        # 7. Products
        prods_res = await client.get("/api/v1/admin/products?per_page=5")
        assert prods_res.status_code == 200
        assert len(prods_res.json()["data"]) == 5

        # 8. Users
        users_res = await client.get("/api/v1/admin/users")
        assert users_res.status_code == 200
        assert len(users_res.json()["data"]) >= 4

        # 9. AI Usage
        ai_res = await client.get("/api/v1/admin/ai/usage")
        assert ai_res.status_code == 200
        assert "summary" in ai_res.json()["data"]

        # 10. Activity logs
        act_res = await client.get("/api/v1/admin/activity-logs")
        assert act_res.status_code == 200
        assert len(act_res.json()["data"]) > 0

        # Cleanup created category
        del_cat = await client.delete(f"/api/v1/admin/categories/{new_cat_id}", headers=headers)
        assert del_cat.status_code == 204
