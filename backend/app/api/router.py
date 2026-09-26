"""Top-level API router configuration."""

from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    repositories,
    issues,
    github,
    agents,
    patches,
    tests,
    security,
    releases,
)

api_router = APIRouter()

# Root health endpoint: /api/health (Phase 1 backward compatibility)
api_router.include_router(health.router, tags=["Health"])

# Canonical Versioned router: /api/v1/...
v1_router = APIRouter(prefix="/v1")
v1_router.include_router(health.router, tags=["Health"])
v1_router.include_router(repositories.router, prefix="/repositories", tags=["Repositories"])
v1_router.include_router(issues.router, prefix="/issues", tags=["Issues"])
v1_router.include_router(github.router, prefix="/github", tags=["GitHub"])
v1_router.include_router(agents.router, prefix="/agents", tags=["Agents"])
v1_router.include_router(patches.router, prefix="/patches", tags=["Patches"])
v1_router.include_router(tests.router, prefix="/tests", tags=["Tests"])
v1_router.include_router(security.router, prefix="/security", tags=["Security"])
v1_router.include_router(releases.router, prefix="/releases", tags=["Releases"])

api_router.include_router(v1_router)
