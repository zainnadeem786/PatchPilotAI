"""Verification tests for Vercel native FastAPI entrypoint and CORS configuration."""

from fastapi import FastAPI
from fastapi.testclient import TestClient
from main import app
from app.main import app as canonical_app
from app.core.config import Settings


def test_vercel_native_entrypoint_app_instance():
    """Verify that main exports the canonical FastAPI instance."""
    assert isinstance(app, FastAPI)
    assert app is canonical_app
    assert app.title == "PatchPilot API"


def test_vercel_native_entrypoint_endpoints():
    """Verify all required production routes are accessible via the native entrypoint."""
    client = TestClient(app)

    # 1. Root endpoint: GET /
    root_res = client.get("/")
    assert root_res.status_code == 200
    root_data = root_res.json()
    assert "service" in root_data
    assert root_data["health"] == "/api/health"
    assert root_data["docs"] == "/docs"

    # 2. Operational Health endpoint: GET /api/health
    health_res = client.get("/api/health")
    assert health_res.status_code == 200
    assert health_res.json() == {"status": "ok", "service": "patchpilot-api"}

    # 3. Versioned Health endpoint: GET /api/v1/health
    v1_health_res = client.get("/api/v1/health")
    assert v1_health_res.status_code == 200
    assert v1_health_res.json() == {"status": "ok", "service": "patchpilot-api"}

    # 4. Interactive Swagger documentation: GET /docs
    docs_res = client.get("/docs")
    assert docs_res.status_code == 200

    # 5. OpenAPI schema endpoint: GET /api/v1/openapi.json
    openapi_res = client.get("/api/v1/openapi.json")
    assert openapi_res.status_code == 200


def test_cors_settings_parsing():
    """Verify CORS origins parsing and trailing slash stripping."""
    # Test comma-separated string with trailing slashes
    s1 = Settings(BACKEND_CORS_ORIGINS="https://example.com/, https://preview.vercel.app/ ")
    assert s1.BACKEND_CORS_ORIGINS == [
        "https://example.com",
        "https://preview.vercel.app",
    ]

    # Test JSON list string
    s2 = Settings(BACKEND_CORS_ORIGINS='["https://app.patchpilot.ai/"]')
    assert s2.BACKEND_CORS_ORIGINS == ["https://app.patchpilot.ai"]

    # Test list of strings
    s3 = Settings(BACKEND_CORS_ORIGINS=["https://foo.com/", "https://bar.com"])
    assert s3.BACKEND_CORS_ORIGINS == ["https://foo.com", "https://bar.com"]

    # Test regex configuration
    s4 = Settings(BACKEND_CORS_ORIGIN_REGEX=r"https://.*\.vercel\.app")
    assert s4.BACKEND_CORS_ORIGIN_REGEX == r"https://.*\.vercel\.app"
