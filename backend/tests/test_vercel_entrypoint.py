"""Verification tests for Vercel serverless entrypoint and CORS configuration."""

from fastapi import FastAPI
from fastapi.testclient import TestClient
from api.index import app
from app.core.config import Settings


def test_vercel_entrypoint_app_instance():
    """Verify that api.index exports a valid FastAPI instance."""
    assert isinstance(app, FastAPI)
    assert app.title == "PatchPilot API"


def test_vercel_entrypoint_endpoints():
    """Verify routes are accessible via the Vercel entrypoint."""
    client = TestClient(app)

    # Root endpoint
    root_res = client.get("/")
    assert root_res.status_code == 200
    root_data = root_res.json()
    assert "service" in root_data
    assert root_data["health"] == "/api/health"

    # API Health endpoint
    health_res = client.get("/api/health")
    assert health_res.status_code == 200
    assert health_res.json() == {"status": "ok", "service": "patchpilot-api"}

    # Versioned API Health endpoint
    v1_health_res = client.get("/api/v1/health")
    assert v1_health_res.status_code == 200
    assert v1_health_res.json() == {"status": "ok", "service": "patchpilot-api"}

    # Docs endpoint
    docs_res = client.get("/docs")
    assert docs_res.status_code == 200

    # OpenAPI JSON endpoint
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
