"""Tests for repository API endpoints under /api/v1/repositories."""

from fastapi.testclient import TestClient
from app.services.github_service import (
    github_service,
    GitHubNotFoundError,
    GitHubConfigurationError,
)

SAMPLE_GITHUB_REPO = {
    "id": 1296269,
    "name": "Hello-World",
    "full_name": "octocat/Hello-World",
    "owner": {"login": "octocat"},
    "description": "This your first repo!",
    "default_branch": "master",
    "private": False,
    "html_url": "https://github.com/octocat/Hello-World",
    "language": "Python",
    "open_issues_count": 2,
}


def test_list_repositories_empty(client: TestClient):
    """Verify empty list is returned when no repositories are tracked."""
    response = client.get("/api/v1/repositories")
    assert response.status_code == 200
    assert response.json() == []


def test_connect_repository_success(client: TestClient, monkeypatch):
    """Verify connecting a repository fetches metadata and persists in database."""
    async def mock_get_repo(owner, name, token=None):
        return SAMPLE_GITHUB_REPO

    async def mock_list_issues(owner, name, state="open", token=None):
        return []

    monkeypatch.setattr(github_service, "get_repository", mock_get_repo)
    monkeypatch.setattr(github_service, "list_repository_issues", mock_list_issues)

    response = client.post(
        "/api/v1/repositories",
        json={"owner": "octocat", "name": "Hello-World"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Hello-World"
    assert data["owner"] == "octocat"
    assert data["full_name"] == "octocat/Hello-World"
    assert data["github_id"] == 1296269
    assert data["language"] == "Python"
    assert "id" in data


def test_get_repository_by_id(client: TestClient, monkeypatch):
    """Verify retrieving a specific repository by its database ID."""
    async def mock_get_repo(owner, name, token=None):
        return SAMPLE_GITHUB_REPO

    monkeypatch.setattr(github_service, "get_repository", mock_get_repo)

    create_res = client.post(
        "/api/v1/repositories",
        json={"owner": "octocat", "name": "Hello-World"},
    )
    repo_id = create_res.json()["id"]

    get_res = client.get(f"/api/v1/repositories/{repo_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == repo_id
    assert get_res.json()["full_name"] == "octocat/Hello-World"


def test_get_repository_not_found(client: TestClient):
    """Verify 404 is returned for nonexistent repository ID."""
    response = client.get("/api/v1/repositories/99999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_connect_repository_validation_error(client: TestClient):
    """Verify invalid owner/name identifiers are rejected with 422 Unprocessable Entity."""
    # Invalid characters / URL injection attempt
    response = client.post(
        "/api/v1/repositories",
        json={"owner": "http://bad.domain", "name": "repo"},
    )
    assert response.status_code == 422


def test_connect_repository_github_not_found(client: TestClient, monkeypatch):
    """Verify 404 is returned when GitHub reports repo does not exist."""
    async def mock_get_repo(owner, name, token=None):
        raise GitHubNotFoundError(f"Repository '{owner}/{name}' was not found on GitHub.")

    monkeypatch.setattr(github_service, "get_repository", mock_get_repo)

    response = client.post(
        "/api/v1/repositories",
        json={"owner": "nonexistent-user", "name": "ghost-repo"},
    )
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_connect_repository_unconfigured_error(client: TestClient, monkeypatch):
    """Verify 503 is returned when GitHub integration credentials are not configured."""
    async def mock_get_repo(owner, name, token=None):
        raise GitHubConfigurationError("GitHub integration is not configured.")

    monkeypatch.setattr(github_service, "get_repository", mock_get_repo)

    response = client.post(
        "/api/v1/repositories",
        json={"owner": "octocat", "name": "Hello-World"},
    )
    assert response.status_code == 503
    assert "not configured" in response.json()["detail"].lower()


def test_connect_repository_separates_issues_and_prs(client: TestClient, monkeypatch):
    """Verify repository connection correctly separates open issues and pull requests."""
    fastapi_mock_repo = {
        "id": 160919119,
        "name": "fastapi",
        "full_name": "fastapi/fastapi",
        "owner": {"login": "fastapi"},
        "description": "FastAPI framework, high performance, easy to learn, fast to code, ready for production",
        "default_branch": "master",
        "private": False,
        "html_url": "https://github.com/fastapi/fastapi",
        "language": "Python",
        "open_issues_count": 82,  # GitHub combined count
    }

    async def mock_get_repo(owner, name, token=None):
        return fastapi_mock_repo

    async def mock_get_counts(owner, name, combined_count, token=None):
        # 82 combined -> 1 pure issue, 81 pull requests
        return 1, 81

    async def mock_list_issues(owner, name, state="open", token=None):
        return [
            {
                "id": 2043685973,
                "number": 10370,
                "title": "Support FastAPI 2.0 specs",
                "state": "open",
                "body": "Issue details",
                "user": {"login": "tiangolo"},
            }
        ]

    monkeypatch.setattr(github_service, "get_repository", mock_get_repo)
    monkeypatch.setattr(github_service, "get_repository_counts", mock_get_counts)
    monkeypatch.setattr(github_service, "list_repository_issues", mock_list_issues)

    res = client.post("/api/v1/repositories", json={"owner": "fastapi", "name": "fastapi"})
    assert res.status_code == 201
    data = res.json()
    assert data["open_issues_count"] == 1
    assert data["open_pull_requests_count"] == 81
    assert data["open_issues_count"] != 82

    repo_id = data["id"]
    get_res = client.get(f"/api/v1/repositories/{repo_id}")
    assert get_res.status_code == 200
    repo_data = get_res.json()
    assert repo_data["open_issues_count"] == 1
    assert repo_data["open_pull_requests_count"] == 81

    # Verify synced issues
    issues_res = client.get(f"/api/v1/repositories/{repo_id}/issues")
    assert issues_res.status_code == 200
    issues = issues_res.json()
    items = issues.get("items", issues) if isinstance(issues, dict) else issues
    assert len(items) == 1
    assert items[0]["number"] == 10370
