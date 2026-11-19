import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_get_categories():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/categories")
        assert res.status_code == 200
        data = res.json()["data"]
        assert len(data) >= 6
        # Find Smartphones or Laptops
        slugs = [c["slug"] for c in data]
        assert "smartphones" in slugs
        assert "laptops" in slugs


@pytest.mark.asyncio
async def test_get_category_filters():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/categories/smartphones/filters")
        assert res.status_code == 200
        data = res.json()["data"]
        assert "category" in data
        assert data["category"]["slug"] == "smartphones"
        assert "price_range" in data
        assert data["price_range"]["min"]["amount"] is not None
        assert "brands" in data
        assert len(data["brands"]) > 0
        assert "availability" in data
        assert len(data["availability"]) == 4
        assert "specs" in data
        assert len(data["specs"]) > 0


@pytest.mark.asyncio
async def test_search_products_pagination():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/products?per_page=10&page=1")
        assert res.status_code == 200
        body = res.json()
        assert "data" in body
        assert "meta" in body
        assert "links" in body
        assert len(body["data"]) == 10
        assert body["meta"]["total"] >= 60
        assert body["meta"]["last_page"] >= 6


@pytest.mark.asyncio
async def test_search_products_filter_and_sort():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Category filter
        res = await ac.get("/api/v1/products?category=smartphones&sort=price_asc")
        assert res.status_code == 200
        items = res.json()["data"]
        assert len(items) > 0
        prices = [float(p["price"]["amount"]) for p in items]
        assert prices == sorted(prices)


@pytest.mark.asyncio
async def test_product_detail_and_price_history():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Get one product slug
        res = await ac.get("/api/v1/products?per_page=1")
        items = res.json()["data"]
        slug = items[0]["slug"]

        # Detail
        detail_res = await ac.get(f"/api/v1/products/{slug}")
        assert detail_res.status_code == 200
        detail = detail_res.json()["data"]
        assert detail["slug"] == slug
        assert len(detail["specs"]) > 0

        # Price History
        ph_res = await ac.get(f"/api/v1/products/{slug}/price-history")
        assert ph_res.status_code == 200
        ph = ph_res.json()["data"]
        assert "currency" in ph
        assert len(ph["points"]) > 0

        # Similar
        sim_res = await ac.get(f"/api/v1/products/{slug}/similar")
        assert sim_res.status_code == 200
        sim = sim_res.json()["data"]
        assert isinstance(sim, list)
