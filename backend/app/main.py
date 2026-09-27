"""Main FastAPI application entrypoint for PatchPilot API."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifespan events."""
    # Phase 1: Startup initialization
    yield
    # Phase 1: Shutdown cleanup


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS for frontend access
cors_origins = [str(origin) for origin in settings.BACKEND_CORS_ORIGINS] if settings.BACKEND_CORS_ORIGINS else []
cors_kwargs = {
    "allow_origins": cors_origins,
    "allow_credentials": True if "*" not in cors_origins else False,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if getattr(settings, "BACKEND_CORS_ORIGIN_REGEX", None):
    cors_kwargs["allow_origin_regex"] = settings.BACKEND_CORS_ORIGIN_REGEX

if cors_origins or cors_kwargs.get("allow_origin_regex"):
    app.add_middleware(CORSMiddleware, **cors_kwargs)


# Mount API routers under /api
app.include_router(api_router, prefix="/api")


@app.get("/", tags=["Root"])
def root():
    """Root redirect / information endpoint."""
    return {
        "service": settings.PROJECT_NAME,
        "docs": "/docs",
        "health": "/api/health",
    }
