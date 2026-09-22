"""Top-level API router configuration."""

from fastapi import APIRouter
from app.api.v1.endpoints import health, repositories, issues, github

api_router = APIRouter()

# Root health endpoint: /api/health (Phase 1 backward compatibility)
api_router.include_router(health.router, tags=["Health"])

# Canonical Versioned router: /api/v1/...
v1_router = APIRouter(prefix="/v1")
v1_router.include_router(health.router, tags=["Health"])
v1_router.include_router(repositories.router, prefix="/repositories", tags=["Repositories"])
v1_router.include_router(issues.router, prefix="/issues", tags=["Issues"])
v1_router.include_router(github.router, prefix="/github", tags=["GitHub"])

api_router.include_router(v1_router)
