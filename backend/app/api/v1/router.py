from fastapi import APIRouter
from app.api.v1.endpoints import account, admin, assistant, auth, catalog, compare, health, reviews, wishlist

api_v1_router = APIRouter()
api_v1_router.include_router(health.router, tags=["Health"])
api_v1_router.include_router(auth.router, tags=["Auth"])
api_v1_router.include_router(account.router, tags=["Account"])
api_v1_router.include_router(catalog.router, tags=["Catalog"])
api_v1_router.include_router(reviews.router, tags=["Reviews"])
api_v1_router.include_router(wishlist.router, tags=["Wishlist"])
api_v1_router.include_router(compare.router, tags=["Compare"])
api_v1_router.include_router(assistant.router, tags=["Assistant"])
api_v1_router.include_router(admin.router, tags=["Admin"])
