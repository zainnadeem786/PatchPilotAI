"""Top-level API router configuration."""

from fastapi import APIRouter
from app.api.v1.endpoints import health

api_router = APIRouter()

# Root health endpoint: /api/health
api_router.include_router(health.router, tags=["Health"])

# Versioned router placeholder: /api/v1/...
v1_router = APIRouter(prefix="/v1")
v1_router.include_router(health.router, tags=["Health"])
api_router.include_router(v1_router)
