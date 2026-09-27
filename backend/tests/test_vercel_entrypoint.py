"""Verification tests for Vercel serverless entrypoint, routing adaptation, and CORS configuration."""

from fastapi import FastAPI
from fastapi.testclient import TestClient
from api.index import app
from app.core.config import Settings


def test_vercel_entrypoint_app_instance():
    """Verify that api.index exports a valid FastAPI instance."""
    assert isinstance(app, FastAPI)
    assert app.title == "PatchPilot API"


def test_vercel_entrypoint_endpoints():
    """Verify routes are accessible directly via the Vercel entrypoint."""
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


def test_vercel_rewrite_routing_scenarios():
    """Verify Vercel rewrite headers and prefix variations are properly adapted."""
    client = TestClient(app)

    # 1. Vercel rewrites incoming /api/health to function /api/index.py with x-matched-path
    r1 = client.get("/api/index.py", headers={"x-matched-path": "/api/health"})
    assert r1.status_code == 200
    assert r1.json() == {"status": "ok", "service": "patchpilot-api"}

    # 2. Vercel rewrites incoming / to function /api/index.py with x-matched-path
    r2 = client.get("/api/index.py", headers={"x-matched-path": "/"})
    assert r2.status_code == 200
    assert "service" in r2.json()

    # 3. Vercel rewrites incoming /docs to function /api/index.py with x-matched-path
    r3 = client.get("/api/index.py", headers={"x-matched-path": "/docs"})
    assert r3.status_code == 200

    # 4. Vercel rewrites incoming /api/v1/health with x-matched-path
    r4 = client.get("/api/index.py", headers={"x-matched-path": "/api/v1/health"})
    assert r4.status_code == 200
    assert r4.json() == {"status": "ok", "service": "patchpilot-api"}

    # 5. Vercel rewrites incoming /api/v1/openapi.json with x-matched-path
    r5 = client.get("/api/index.py", headers={"x-matched-path": "/api/v1/openapi.json"})
    assert r5.status_code == 200

    # 6. Fallback when request hits /api/index.py without routing headers
    r6 = client.get("/api/index.py")
    assert r6.status_code == 200
    assert "service" in r6.json()

    # 7. Unprefixed /health adaptation
    r7 = client.get("/health")
    assert r7.status_code == 200
    assert r7.json() == {"status": "ok", "service": "patchpilot-api"}

    # 8. Unprefixed /v1/health adaptation
    r8 = client.get("/v1/health")
    assert r8.status_code == 200
    assert r8.json() == {"status": "ok", "service": "patchpilot-api"}

    # 9. Trailing slash normalization
    r9 = client.get("/api/health/")
    assert r9.status_code == 200
    assert r9.json() == {"status": "ok", "service": "patchpilot-api"}


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
