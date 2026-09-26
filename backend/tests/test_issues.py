"""Tests for issue API endpoints under /api/v1/issues."""

from fastapi.testclient import TestClient
from app.services.github_service import github_service

SAMPLE_GITHUB_REPO = {
    "id": 1296269,
    "name": "Hello-World",
    "full_name": "octocat/Hello-World",
    "owner": {"login": "octocat"},
    "description": "Sample repo",
    "default_branch": "main",
    "private": False,
    "html_url": "https://github.com/octocat/Hello-World",
    "language": "Python",
    "open_issues_count": 2,
}

SAMPLE_GITHUB_ISSUES = [
    {
        "id": 1001,
        "number": 1,
        "title": "Bug in user profile routing",
        "body": "User profile returns 404 when username has dot.",
        "state": "open",
        "html_url": "https://github.com/octocat/Hello-World/issues/1",
        "user": {"login": "octocat"},
    },
    {
        "id": 1002,
        "number": 2,
        "title": "Add documentation for REST endpoints",
        "body": "API reference needs markdown updates.",
        "state": "closed",
        "html_url": "https://github.com/octocat/Hello-World/issues/2",
        "user": {"login": "contributor"},
    },
]


def test_list_issues_empty(client: TestClient):
    """Verify empty list is returned when no issues exist."""
    response = client.get("/api/v1/issues")
    assert response.status_code == 200
    assert response.json() == []


def test_list_and_filter_issues(client: TestClient, monkeypatch):
    """Verify listing issues and filtering by state and repository_id."""
    async def mock_get_repo(owner, name, token=None):
        return SAMPLE_GITHUB_REPO

    async def mock_list_issues(owner, name, state="open", token=None):
        return SAMPLE_GITHUB_ISSUES

    monkeypatch.setattr(github_service, "get_repository", mock_get_repo)
    monkeypatch.setattr(github_service, "list_repository_issues", mock_list_issues)

    # 1. Connect repo (triggers issue sync)
    repo_res = client.post(
        "/api/v1/repositories",
        json={"owner": "octocat", "name": "Hello-World"},
    )
    repo_id = repo_res.json()["id"]

    # 2. List all issues
    issues_res = client.get("/api/v1/issues")
    assert issues_res.status_code == 200
    all_issues = issues_res.json()
    assert len(all_issues) == 2

    # 3. Filter by repository_id
    repo_issues_res = client.get(f"/api/v1/issues?repository_id={repo_id}")
    assert repo_issues_res.status_code == 200
    assert len(repo_issues_res.json()) == 2

    # 4. Filter by state
    open_issues = client.get("/api/v1/issues?state=open").json()
    assert len(open_issues) == 1
    assert open_issues[0]["state"] == "open"
    assert open_issues[0]["number"] == 1

    closed_issues = client.get("/api/v1/issues?state=closed").json()
    assert len(closed_issues) == 1
    assert closed_issues[0]["state"] == "closed"
    assert closed_issues[0]["number"] == 2

    # 5. List via repo subresource
    sub_issues_res = client.get(f"/api/v1/repositories/{repo_id}/issues")
    assert sub_issues_res.status_code == 200
    assert len(sub_issues_res.json()) == 2


def test_get_issue_by_id(client: TestClient, monkeypatch):
    """Verify retrieving a single issue by primary key ID."""
    async def mock_get_repo(owner, name, token=None):
        return SAMPLE_GITHUB_REPO

    async def mock_list_issues(owner, name, state="open", token=None):
        return SAMPLE_GITHUB_ISSUES

    monkeypatch.setattr(github_service, "get_repository", mock_get_repo)
    monkeypatch.setattr(github_service, "list_repository_issues", mock_list_issues)

    client.post("/api/v1/repositories", json={"owner": "octocat", "name": "Hello-World"})
    issues = client.get("/api/v1/issues").json()
    target_id = issues[0]["id"]

    res = client.get(f"/api/v1/issues/{target_id}")
    assert res.status_code == 200
    assert res.json()["id"] == target_id
    assert res.json()["number"] == issues[0]["number"]


def test_get_issue_not_found(client: TestClient):
    """Verify 404 is returned for nonexistent issue ID."""
    response = client.get("/api/v1/issues/99999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_sync_issues_excludes_pull_requests(client: TestClient, monkeypatch):
    """Verify that Pull Requests are excluded when syncing repository issues."""
    mixed_github_items = [
        {
            "id": 5001,
            "number": 10,
            "title": "Actual GitHub Issue",
            "body": "This is a real issue.",
            "state": "open",
            "html_url": "https://github.com/octocat/Hello-World/issues/10",
            "user": {"login": "reporter"},
        },
        {
            "id": 5002,
            "number": 11,
            "title": "A Pull Request mistakenly returned by GitHub",
            "body": "This is a PR diff.",
            "state": "open",
            "html_url": "https://github.com/octocat/Hello-World/pull/11",
            "user": {"login": "contributor"},
            "pull_request": {
                "url": "https://api.github.com/repos/octocat/Hello-World/pulls/11",
                "html_url": "https://github.com/octocat/Hello-World/pull/11",
            },
        },
    ]

    async def mock_get_repo(owner, name, token=None):
        return SAMPLE_GITHUB_REPO

    async def mock_list_issues(owner, name, state="open", token=None):
        # Even if GitHub service or mock returned raw items containing a PR:
        return [item for item in mixed_github_items if "pull_request" not in item]

    monkeypatch.setattr(github_service, "get_repository", mock_get_repo)
    monkeypatch.setattr(github_service, "list_repository_issues", mock_list_issues)

    # 1. Connect repository
    repo_res = client.post(
        "/api/v1/repositories",
        json={"owner": "octocat", "name": "Hello-World"},
    )
    assert repo_res.status_code == 201
    repo_id = repo_res.json()["id"]

    # 2. Verify only actual issue #10 is in PatchPilot issues
    issues_res = client.get(f"/api/v1/repositories/{repo_id}/issues")
    assert issues_res.status_code == 200
    issues = issues_res.json()
    assert len(issues) == 1
    assert issues[0]["number"] == 10
    assert issues[0]["title"] == "Actual GitHub Issue"
    assert "pull_request" not in issues[0]


def test_direct_sync_excludes_pull_requests(db_session):
    """Verify issue_service.sync_issues_for_repository directly ignores items with pull_request key."""
    from app.services.repository_service import repository_service
    from app.services.issue_service import issue_service
    from app.models.issue import Issue

    repo = repository_service.create_or_sync_repository(db_session, SAMPLE_GITHUB_REPO)

    raw_mixed_items = [
        {
            "id": 6001,
            "number": 21,
            "title": "Genuine Issue",
            "body": "Bug description",
            "state": "open",
            "html_url": "https://github.com/octocat/Hello-World/issues/21",
            "user": {"login": "user1"},
        },
        {
            "id": 6002,
            "number": 22,
            "title": "Pull Request Item",
            "body": "PR description",
            "state": "open",
            "html_url": "https://github.com/octocat/Hello-World/pull/22",
            "user": {"login": "user2"},
            "pull_request": {"url": "https://api.github.com/repos/octocat/Hello-World/pulls/22"},
        },
    ]

    synced = issue_service.sync_issues_for_repository(db_session, repo.id, raw_mixed_items)
    assert len(synced) == 1
    assert synced[0].number == 21

    # Verify directly in database query
    db_issues = db_session.query(Issue).filter(Issue.repository_id == repo.id).all()
    assert len(db_issues) == 1
    assert db_issues[0].number == 21


def test_analyze_issue_runs_agent_pipeline(client: TestClient, monkeypatch):
    """Verify POST /issues/{id}/analyze runs the full Phase 4 pipeline in static mode."""
    async def mock_get_repo(owner, name, token=None):
        return SAMPLE_GITHUB_REPO

    async def mock_list_issues(owner, name, state="open", token=None):
        return SAMPLE_GITHUB_ISSUES

    async def mock_get_contents(owner, name, path="", token=None):
        return [{"path": "app/routing.py", "type": "file", "size": 120}]

    monkeypatch.setattr(github_service, "get_repository", mock_get_repo)
    monkeypatch.setattr(github_service, "list_repository_issues", mock_list_issues)
    monkeypatch.setattr(github_service, "get_repository_contents", mock_get_contents)

    client.post("/api/v1/repositories", json={"owner": "octocat", "name": "Hello-World"})
    issue_id = client.get("/api/v1/issues").json()[0]["id"]

    response = client.post(f"/api/v1/issues/{issue_id}/analyze")

    assert response.status_code == 200
    data = response.json()
    assert data["issue_id"] == issue_id
    agent_names = {r["agent_name"] for r in data["results"]}
    assert agent_names == {
        "orchestrator",
        "repository_intelligence",
        "patch_synthesis",
        "regression_test_synthesis",
        "security_audit",
        "release",
    }
    assert all(r["mode"] == "static" for r in data["results"])


def test_analyze_issue_not_found(client: TestClient):
    """Verify 404 is returned when analyzing a nonexistent issue ID."""
    response = client.post("/api/v1/issues/99999/analyze")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()



def test_analyze_issue_partial_agent_failure(client: TestClient, monkeypatch):
    """Phase 5: verify that a single failing agent does not abort the pipeline.

    When one agent raises an unhandled exception the pipeline should still
    return HTTP 200 with all five agent result slots present; the failing agent
    slot should carry status 'error' while the other four remain 'success'.
    """
    from app.agents.security_audit_agent import SecurityAuditAgent
    from app.agents.types import AgentContext, AgentResult

    async def mock_get_repo(owner, name, token=None):
        return SAMPLE_GITHUB_REPO

    async def mock_list_issues(owner, name, state="open", token=None):
        return SAMPLE_GITHUB_ISSUES

    async def mock_get_contents(owner, name, path="", token=None):
        return []

    async def mock_security_run(self, context: AgentContext) -> AgentResult:
        raise RuntimeError("Simulated security agent failure")

    monkeypatch.setattr(github_service, "get_repository", mock_get_repo)
    monkeypatch.setattr(github_service, "list_repository_issues", mock_list_issues)
    monkeypatch.setattr(github_service, "get_repository_contents", mock_get_contents)
    monkeypatch.setattr(SecurityAuditAgent, "run", mock_security_run)

    client.post("/api/v1/repositories", json={"owner": "octocat", "name": "Hello-World"})
    issue_id = client.get("/api/v1/issues").json()[0]["id"]

    response = client.post(f"/api/v1/issues/{issue_id}/analyze")

    # Pipeline must NOT return a 500; partial failure is handled gracefully.
    assert response.status_code == 200
    data = response.json()
    assert data["issue_id"] == issue_id

    results_by_name = {r["agent_name"]: r for r in data["results"]}

    # All six agents must still appear in the result set.
    assert set(results_by_name.keys()) == {
        "orchestrator",
        "repository_intelligence",
        "patch_synthesis",
        "regression_test_synthesis",
        "security_audit",
        "release",
    }

    # Four non-security agents succeeded.
    assert results_by_name["orchestrator"]["status"] == "success"
    assert results_by_name["repository_intelligence"]["status"] == "success"
    assert results_by_name["patch_synthesis"]["status"] == "success"
    assert results_by_name["regression_test_synthesis"]["status"] == "success"

    # Security Audit must be marked as error and include an error message.
    security_result = results_by_name["security_audit"]
    assert security_result["status"] == "error"
    assert security_result["error"] is not None
    assert len(security_result["error"]) > 0

    # ReleaseAgent still runs after the security failure and reports it as a blocker.
    release_result = results_by_name["release"]
    assert release_result["status"] == "success"
    assert release_result["data"]["release_ready"] is False
    assert any("security_audit" in r for r in release_result["data"]["blocking_reasons"])


def test_analyze_issue_response_schema(client: TestClient, monkeypatch):
    """Phase 5: verify EngineResultResponse schema shape for frontend type safety."""
    async def mock_get_repo(owner, name, token=None):
        return SAMPLE_GITHUB_REPO

    async def mock_list_issues(owner, name, state="open", token=None):
        return SAMPLE_GITHUB_ISSUES

    async def mock_get_contents(owner, name, path="", token=None):
        return []

    monkeypatch.setattr(github_service, "get_repository", mock_get_repo)
    monkeypatch.setattr(github_service, "list_repository_issues", mock_list_issues)
    monkeypatch.setattr(github_service, "get_repository_contents", mock_get_contents)

    client.post("/api/v1/repositories", json={"owner": "octocat", "name": "Hello-World"})
    issue_id = client.get("/api/v1/issues").json()[0]["id"]

    response = client.post(f"/api/v1/issues/{issue_id}/analyze")
    assert response.status_code == 200
    data = response.json()

    # Top-level shape
    assert "repository_id" in data
    assert "issue_id" in data
    assert "results" in data
    assert "roadmap" in data
    assert isinstance(data["results"], list)
    assert isinstance(data["roadmap"], list)

    # Each AgentResultResponse shape
    for result in data["results"]:
        assert "agent_name" in result
        assert "status" in result
        assert "mode" in result
        assert "summary" in result
        assert "findings" in result
        assert "data" in result
        assert isinstance(result["findings"], list)

        # Each AgentFindingResponse shape
        for finding in result["findings"]:
            assert "title" in finding
            assert "detail" in finding
            assert "severity" in finding
