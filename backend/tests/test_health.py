"""Health endpoint verification tests."""

from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient):
    """Verify root endpoint responds with basic service info."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    assert data["health"] == "/api/health"


def test_health_endpoint(client: TestClient):
    """Verify /api/health returns 200 OK and expected JSON schema."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data == {
        "status": "ok",
        "service": "patchpilot-api",
    }


def test_versioned_health_endpoint(client: TestClient):
    """Verify /api/v1/health returns 200 OK and matching response."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "patchpilot-api"
