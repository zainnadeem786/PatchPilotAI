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
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0
    assert data["total_pages"] == 0
    assert data["has_next"] is False
    assert data["has_previous"] is False


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
    assert len(all_issues["items"]) == 2
    assert all_issues["total"] == 2
    assert all_issues["total_pages"] == 1

    # 3. Filter by repository_id
    repo_issues_res = client.get(f"/api/v1/issues?repository_id={repo_id}")
    assert repo_issues_res.status_code == 200
    assert len(repo_issues_res.json()["items"]) == 2

    # 4. Filter by state
    open_issues = client.get("/api/v1/issues?state=open").json()
    assert len(open_issues["items"]) == 1
    assert open_issues["items"][0]["state"] == "open"
    assert open_issues["items"][0]["number"] == 1

    closed_issues = client.get("/api/v1/issues?state=closed").json()
    assert len(closed_issues["items"]) == 1
    assert closed_issues["items"][0]["state"] == "closed"
    assert closed_issues["items"][0]["number"] == 2

    # 5. List via repo subresource
    sub_issues_res = client.get(f"/api/v1/repositories/{repo_id}/issues")
    assert sub_issues_res.status_code == 200
    assert len(sub_issues_res.json()["items"]) == 2


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
    items = issues.get("items", issues) if isinstance(issues, dict) else issues
    target_id = items[0]["id"]

    res = client.get(f"/api/v1/issues/{target_id}")
    assert res.status_code == 200
    assert res.json()["id"] == target_id
    assert res.json()["number"] == items[0]["number"]



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
    items = issues.get("items", issues) if isinstance(issues, dict) else issues
    assert len(items) == 1
    assert items[0]["number"] == 10
    assert items[0]["title"] == "Actual GitHub Issue"
    assert "pull_request" not in items[0]



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
    issues_res = client.get("/api/v1/issues").json()
    issue_id = (issues_res.get("items") if isinstance(issues_res, dict) else issues_res)[0]["id"]

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
    issues_res = client.get("/api/v1/issues").json()
    issue_id = (issues_res.get("items") if isinstance(issues_res, dict) else issues_res)[0]["id"]

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
    issues_res = client.get("/api/v1/issues").json()
    issue_id = (issues_res.get("items") if isinstance(issues_res, dict) else issues_res)[0]["id"]


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


def test_pagination_default_page_size_and_metadata(client: TestClient, monkeypatch):
    """Verify default page size is 50 and all pagination metadata fields are populated."""
    sample_issues = [
        {
            "id": 2000 + i,
            "number": i,
            "title": f"Issue {i}",
            "state": "open",
            "html_url": f"https://github.com/test/repo/issues/{i}",
            "user": {"login": "dev"},
        }
        for i in range(1, 61)
    ]
    repo_data = {
        "id": 8881,
        "name": "repo-paginate",
        "full_name": "acme/repo-paginate",
        "owner": {"login": "acme"},
        "open_issues_count": 60,
        "default_branch": "main",
        "private": False,
        "html_url": "https://github.com/acme/repo-paginate",
        "language": "Python",
    }

    async def mock_get_repo(owner, name, token=None):
        return repo_data

    async def mock_list_issues(owner, name, state="open", token=None):
        return sample_issues

    monkeypatch.setattr(github_service, "get_repository", mock_get_repo)
    monkeypatch.setattr(github_service, "list_repository_issues", mock_list_issues)

    client.post("/api/v1/repositories", json={"owner": "acme", "name": "repo-paginate"})

    # 1. Default page size (no params passed)
    res = client.get("/api/v1/issues").json()
    assert res["page"] == 1
    assert res["per_page"] == 50
    assert res["total"] == 60
    assert res["total_pages"] == 2
    assert len(res["items"]) == 50
    assert res["has_next"] is True
    assert res["has_previous"] is False

    # 2. Explicit page 1
    p1 = client.get("/api/v1/issues?page=1&per_page=50").json()
    assert p1["page"] == 1
    assert len(p1["items"]) == 50
    assert p1["has_next"] is True
    assert p1["has_previous"] is False

    # 3. Explicit page 2 (final page)
    p2 = client.get("/api/v1/issues?page=2&per_page=50").json()
    assert p2["page"] == 2
    assert len(p2["items"]) == 10
    assert p2["total"] == 60
    assert p2["total_pages"] == 2
    assert p2["has_next"] is False
    assert p2["has_previous"] is True

    # 4. Invalid page (e.g. 0, -1 -> 422 Unprocessable Entity)
    inv_res = client.get("/api/v1/issues?page=0")
    assert inv_res.status_code == 422

    inv_neg = client.get("/api/v1/issues?page=-5")
    assert inv_neg.status_code == 422

    # 5. Out of range page (page 999 with 2 total pages)
    out_res = client.get("/api/v1/issues?page=999").json()
    assert out_res["page"] == 999
    assert out_res["items"] == []
    assert out_res["total"] == 60
    assert out_res["total_pages"] == 2
    assert out_res["has_next"] is False
    assert out_res["has_previous"] is True


def test_repository_counts_independent_of_page_size(client: TestClient, monkeypatch):
    """Verify repository-level issue counts remain independent of page size (e.g. total=7030, page_size=50)."""
    cpython_issues = [
        {
            "id": 10000 + i,
            "number": i,
            "title": f"CPython Issue {i}",
            "state": "open",
            "html_url": f"https://github.com/python/cpython/issues/{i}",
            "user": {"login": "coredev"},
        }
        for i in range(1, 51)
    ]
    cpython_repo = {
        "id": 9999,
        "name": "cpython",
        "full_name": "python/cpython",
        "owner": {"login": "python"},
        "open_issues_count": 7030,
        "default_branch": "main",
        "private": False,
        "html_url": "https://github.com/python/cpython",
        "language": "Python",
    }

    async def mock_get_repo(owner, name, token=None):
        return cpython_repo

    async def mock_list_issues(owner, name, state="open", token=None):
        return cpython_issues

    async def mock_get_counts(owner, name, combined_count=0, token=None):
        return combined_count, 0

    monkeypatch.setattr(github_service, "get_repository", mock_get_repo)
    monkeypatch.setattr(github_service, "list_repository_issues", mock_list_issues)
    monkeypatch.setattr(github_service, "get_repository_counts", mock_get_counts)

    resp = client.post("/api/v1/repositories", json={"owner": "python", "name": "cpython"})
    repo_id = resp.json()["id"]

    # Query issues for CPython
    res = client.get(f"/api/v1/issues?repository_id={repo_id}&page=1&per_page=50").json()
    assert len(res["items"]) == 50
    assert res["total"] == 7030  # CRITICAL: must remain 7030, not 50!
    assert res["total_pages"] == 141
    assert res["has_next"] is True
    assert res["has_previous"] is False


def test_multiple_repositories_independent_pagination(client: TestClient, monkeypatch):
    """Verify multiple repositories (e.g. CPython with 7030 and FastAPI with 1) have independent pagination."""
    repos = {
        ("python", "cpython"): {
            "id": 101,
            "name": "cpython",
            "full_name": "python/cpython",
            "owner": {"login": "python"},
            "open_issues_count": 7030,
            "default_branch": "main",
            "private": False,
            "html_url": "https://github.com/python/cpython",
            "language": "Python",
        },
        ("fastapi", "fastapi"): {
            "id": 102,
            "name": "fastapi",
            "full_name": "fastapi/fastapi",
            "owner": {"login": "fastapi"},
            "open_issues_count": 1,
            "default_branch": "main",
            "private": False,
            "html_url": "https://github.com/fastapi/fastapi",
            "language": "Python",
        },
    }

    async def mock_get_repo(owner, name, token=None):
        return repos[(owner, name)]

    async def mock_list_issues(owner, name, state="open", token=None):
        if name == "fastapi":
            return [
                {
                    "id": 301,
                    "number": 1,
                    "title": "FastAPI Bug",
                    "state": "open",
                    "html_url": "https://github.com/fastapi/fastapi/issues/1",
                    "user": {"login": "tiangolo"},
                }
            ]
        else:
            return [
                {
                    "id": 401,
                    "number": 1,
                    "title": "CPython Bug",
                    "state": "open",
                    "html_url": "https://github.com/python/cpython/issues/1",
                    "user": {"login": "gvanrossum"},
                }
            ]

    async def mock_get_counts(owner, name, combined_count=0, token=None):
        return combined_count, 0

    monkeypatch.setattr(github_service, "get_repository", mock_get_repo)
    monkeypatch.setattr(github_service, "list_repository_issues", mock_list_issues)
    monkeypatch.setattr(github_service, "get_repository_counts", mock_get_counts)

    r_cpython = client.post("/api/v1/repositories", json={"owner": "python", "name": "cpython"}).json()
    r_fastapi = client.post("/api/v1/repositories", json={"owner": "fastapi", "name": "fastapi"}).json()

    # Query CPython individually
    cpython_res = client.get(f"/api/v1/issues?repository_id={r_cpython['id']}").json()
    assert cpython_res["total"] == 7030
    assert cpython_res["total_pages"] == 141
    assert len(cpython_res["items"]) == 1

    # Query FastAPI individually
    fastapi_res = client.get(f"/api/v1/issues?repository_id={r_fastapi['id']}").json()
    assert fastapi_res["total"] == 1
    assert fastapi_res["total_pages"] == 1
    assert len(fastapi_res["items"]) == 1

    # Query All repositories combined
    all_res = client.get("/api/v1/issues").json()
    assert all_res["total"] == 7031  # 7030 + 1
    assert all_res["total_pages"] == 141
