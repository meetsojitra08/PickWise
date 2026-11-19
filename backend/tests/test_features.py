import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_wishlist_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. CSRF cookie
        csrf_res = await client.get("/sanctum/csrf-cookie")
        xsrf = csrf_res.cookies.get("XSRF-TOKEN")
        # 2. Login
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "customer@pickwise.test", "password": "password"},
            headers={"X-XSRF-TOKEN": xsrf},
        )
        assert login_res.status_code == 200
        xsrf = client.cookies.get("XSRF-TOKEN") or xsrf

        # 3. Get products
        prod_res = await client.get("/api/v1/products?per_page=1")
        prod_id = prod_res.json()["data"][0]["id"]

        # 4. Add to wishlist
        add_res = await client.post(
            "/api/v1/wishlist",
            json={"product_id": prod_id},
            headers={"X-XSRF-TOKEN": xsrf},
        )
        assert add_res.status_code in (200, 201)

        # 5. Get wishlist
        get_res = await client.get("/api/v1/wishlist")
        assert get_res.status_code == 200
        items = get_res.json()["data"]
        assert any(item["product"]["id"] == prod_id for item in items if item["product"])

        # 6. Delete from wishlist
        del_res = await client.delete(
            f"/api/v1/wishlist/{prod_id}",
            headers={"X-XSRF-TOKEN": xsrf},
        )
        assert del_res.status_code == 204


@pytest.mark.asyncio
async def test_compare_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. CSRF
        csrf_res = await client.get("/sanctum/csrf-cookie")
        xsrf = csrf_res.cookies.get("XSRF-TOKEN")
        # 2. Login
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "customer@pickwise.test", "password": "password"},
            headers={"X-XSRF-TOKEN": xsrf},
        )
        assert login_res.status_code == 200
        xsrf = client.cookies.get("XSRF-TOKEN") or xsrf

        # 3. Get 2 products in smartphones
        prod_res = await client.get("/api/v1/products?category=smartphones&per_page=2")
        products = prod_res.json()["data"]
        p1 = products[0]["id"]
        p2 = products[1]["id"]

        # 4. Post /compare
        comp_res = await client.post(
            "/api/v1/compare",
            json={"product_ids": [p1, p2]},
            headers={"X-XSRF-TOKEN": xsrf},
        )
        assert comp_res.status_code == 200
        matrix = comp_res.json()["data"]
        assert "rows" in matrix
        assert len(matrix["products"]) == 2
        assert matrix["category"]["slug"] == "smartphones"

        # 5. Create saved comparison
        save_res = await client.post(
            "/api/v1/comparisons",
            json={"name": "My Comparison", "product_ids": [p1, p2]},
            headers={"X-XSRF-TOKEN": xsrf},
        )
        assert save_res.status_code == 201
        saved = save_res.json()["data"]
        comp_id = saved["id"]

        # 6. Share comparison
        share_res = await client.post(
            f"/api/v1/comparisons/{comp_id}/share",
            headers={"X-XSRF-TOKEN": xsrf},
        )
        assert share_res.status_code == 200
        token = share_res.json()["data"]["share_token"]
        assert token is not None

        # 7. Public shared comparison
        public_res = await client.get(f"/api/v1/shared/comparisons/{token}")
        assert public_res.status_code == 200
        assert public_res.json()["data"]["name"] == "My Comparison"

        # 8. Delete saved comparison
        del_res = await client.delete(
            f"/api/v1/comparisons/{comp_id}",
            headers={"X-XSRF-TOKEN": xsrf},
        )
        assert del_res.status_code == 204


@pytest.mark.asyncio
async def test_review_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Get a product
        prod_res = await client.get("/api/v1/products?per_page=1")
        slug = prod_res.json()["data"][0]["slug"]

        # List reviews
        list_res = await client.get(f"/api/v1/products/{slug}/reviews")
        assert list_res.status_code == 200
        assert "rating_distribution" in list_res.json()["meta"]
