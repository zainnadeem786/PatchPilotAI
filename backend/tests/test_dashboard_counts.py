"""Tests verifying canonical count semantics and consistency across all PatchPilot endpoints."""

from app.services.github_service import github_service


def test_canonical_counts_empty_state(client):
    """Verify that in a fresh state, all entity endpoints report 0, while the agent registry reports 6."""
    repos = client.get("/api/v1/repositories").json()
    assert len(repos) == 0

    issues = client.get("/api/v1/issues").json()
    assert len(issues) == 0

    open_issues = client.get("/api/v1/issues?state=open").json()
    assert len(open_issues) == 0

    agents = client.get("/api/v1/agents").json()
    assert len(agents) == 6

    patches = client.get("/api/v1/patches").json()
    assert len(patches) == 0

    tests = client.get("/api/v1/tests").json()
    assert len(tests) == 0

    security = client.get("/api/v1/security").json()
    assert len(security) == 0

    releases = client.get("/api/v1/releases").json()
    assert len(releases) == 0


def test_open_issues_vs_total_issues_count_semantics(client, db_session, monkeypatch):
    """Verify that 'Open Issues' semantics strictly count issues with state='open'."""
    SAMPLE_REPO = {
        "id": 1001,
        "name": "sample-repo",
        "full_name": "acme/sample-repo",
        "owner": {"login": "acme"},
        "description": "Test Repo",
        "default_branch": "main",
        "private": False,
        "html_url": "https://github.com/acme/sample-repo",
        "language": "Python",
        "open_issues_count": 1,
    }
    SAMPLE_ISSUES = [
        {
            "id": 501,
            "number": 1,
            "title": "Bug in auth",
            "body": "Token expiration issue",
            "state": "open",
            "html_url": "https://github.com/acme/sample-repo/issues/1",
            "user": {"login": "user1"},
        },
        {
            "id": 502,
            "number": 2,
            "title": "Old resolved question",
            "body": "Fixed in previous release",
            "state": "closed",
            "html_url": "https://github.com/acme/sample-repo/issues/2",
            "user": {"login": "user2"},
        },
    ]

    async def mock_get_repo(owner, name, token=None):
        return SAMPLE_REPO

    async def mock_list_issues(owner, name, state="open", token=None):
        if state == "open":
            return [i for i in SAMPLE_ISSUES if i["state"] == "open"]
        if state == "closed":
            return [i for i in SAMPLE_ISSUES if i["state"] == "closed"]
        return SAMPLE_ISSUES

    async def mock_get_contents(owner, name, path="", token=None):
        return []

    monkeypatch.setattr(github_service, "get_repository", mock_get_repo)
    monkeypatch.setattr(github_service, "list_repository_issues", mock_list_issues)
    monkeypatch.setattr(github_service, "get_repository_contents", mock_get_contents)

    # Connect repository (syncs issues)
    resp = client.post("/api/v1/repositories", json={"owner": "acme", "name": "sample-repo"})
    assert resp.status_code == 201

    # Verify repository count is 1
    assert len(client.get("/api/v1/repositories").json()) == 1

    # Ingest closed issue manually into db_session to verify state filtering
    from app.models.issue import Issue

    closed_issue = Issue(
        repository_id=resp.json()["id"],
        github_issue_id=502,
        number=2,
        title="Old resolved question",
        body="Fixed in previous release",
        state="closed",
        author="user2",
        html_url="https://github.com/acme/sample-repo/issues/2",
    )
    db_session.add(closed_issue)
    db_session.commit()

    # Total issues count
    total_issues = client.get("/api/v1/issues").json()
    assert len(total_issues) == 2

    # Open issues count
    open_issues = client.get("/api/v1/issues?state=open").json()
    assert len(open_issues) == 1
    assert open_issues[0]["state"] == "open"
    assert open_issues[0]["number"] == 1

    # Closed issues count
    closed_issues = client.get("/api/v1/issues?state=closed").json()
    assert len(closed_issues) == 1
    assert closed_issues[0]["state"] == "closed"
    assert closed_issues[0]["number"] == 2


def test_multiple_analysis_runs_count_consistency(client, monkeypatch):
    """Verify that multiple analysis runs increment patches, tests, security findings, and releases consistently."""
    SAMPLE_REPO = {
        "id": 2002,
        "name": "calc",
        "full_name": "acme/calc",
        "owner": {"login": "acme"},
        "description": "Calculator",
        "default_branch": "main",
        "private": False,
        "html_url": "https://github.com/acme/calc",
        "language": "Python",
        "open_issues_count": 1,
    }
    SAMPLE_ISSUES = [
        {
            "id": 601,
            "number": 10,
            "title": "Division by zero crash",
            "body": "Unhandled ZeroDivisionError in divide() function",
            "state": "open",
            "html_url": "https://github.com/acme/calc/issues/10",
            "user": {"login": "mathguy"},
        }
    ]

    async def mock_get_repo(owner, name, token=None):
        return SAMPLE_REPO

    async def mock_list_issues(owner, name, state="open", token=None):
        return SAMPLE_ISSUES

    async def mock_get_contents(owner, name, path="", token=None):
        return []

    monkeypatch.setattr(github_service, "get_repository", mock_get_repo)
    monkeypatch.setattr(github_service, "list_repository_issues", mock_list_issues)
    monkeypatch.setattr(github_service, "get_repository_contents", mock_get_contents)

    client.post("/api/v1/repositories", json={"owner": "acme", "name": "calc"})
    issue_id = client.get("/api/v1/issues").json()[0]["id"]

    # First analysis run
    run1 = client.post(f"/api/v1/issues/{issue_id}/analyze")
    assert run1.status_code == 200

    assert len(client.get("/api/v1/patches").json()) == 1
    assert len(client.get("/api/v1/tests").json()) == 1
    sec1_count = len(client.get("/api/v1/security").json())
    assert sec1_count >= 1
    assert len(client.get("/api/v1/releases").json()) == 1

    # Second analysis run on the same issue
    run2 = client.post(f"/api/v1/issues/{issue_id}/analyze")
    assert run2.status_code == 200

    # Total persisted records must now reflect 2 runs
    patches = client.get("/api/v1/patches").json()
    assert len(patches) == 2

    tests = client.get("/api/v1/tests").json()
    assert len(tests) == 2

    security = client.get("/api/v1/security").json()
    assert len(security) == sec1_count * 2

    releases = client.get("/api/v1/releases").json()
    assert len(releases) == 2

    # Scoped queries by issue_id match the totals for this issue
    assert len(client.get(f"/api/v1/patches?issue_id={issue_id}").json()) == 2
    assert len(client.get(f"/api/v1/tests?issue_id={issue_id}").json()) == 2
    assert len(client.get(f"/api/v1/security?issue_id={issue_id}").json()) == sec1_count * 2
    assert len(client.get(f"/api/v1/releases?issue_id={issue_id}").json()) == 2
