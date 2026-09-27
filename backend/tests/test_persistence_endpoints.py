"""Phase 6 tests: analysis-run persistence and the /patches, /tests, /security, /releases endpoints."""


def _connect_and_analyze(client, monkeypatch):
    from app.services.github_service import github_service

    SAMPLE_REPO = {
        "id": 5555, "name": "widget", "full_name": "acme/widget",
        "owner": {"login": "acme"}, "description": "Test",
        "default_branch": "main", "private": False,
        "html_url": "https://github.com/acme/widget",
        "language": "Python", "open_issues_count": 1,
    }
    SAMPLE_ISSUES = [{
        "id": 202, "number": 7, "title": "Hardcoded secret in config",
        "body": "api_key = 'sk-1234567890abcdef' left in by mistake.",
        "state": "open",
        "html_url": "https://github.com/acme/widget/issues/7",
        "user": {"login": "octocat"},
    }]

    async def mock_get_repo(owner, name, token=None):
        return SAMPLE_REPO

    async def mock_list_issues(owner, name, state="open", token=None):
        return SAMPLE_ISSUES

    async def mock_get_contents(owner, name, path="", token=None):
        return []

    monkeypatch.setattr(github_service, "get_repository", mock_get_repo)
    monkeypatch.setattr(github_service, "list_repository_issues", mock_list_issues)
    monkeypatch.setattr(github_service, "get_repository_contents", mock_get_contents)

    client.post("/api/v1/repositories", json={"owner": "acme", "name": "widget"})
    issue_id = client.get("/api/v1/issues").json()[0]["id"]

    response = client.post(f"/api/v1/issues/{issue_id}/analyze")
    assert response.status_code == 200
    return issue_id


# ── Empty states ───────────────────────────────────────────────────────────────


def test_patches_endpoint_empty_before_any_analysis(client):
    assert client.get("/api/v1/patches").json() == []


def test_tests_endpoint_empty_before_any_analysis(client):
    assert client.get("/api/v1/tests").json() == []


def test_security_endpoint_empty_before_any_analysis(client):
    assert client.get("/api/v1/security").json() == []


def test_releases_endpoint_empty_before_any_analysis(client):
    assert client.get("/api/v1/releases").json() == []


# ── 404s ───────────────────────────────────────────────────────────────────────


def test_patch_detail_404_when_missing(client):
    assert client.get("/api/v1/patches/999").status_code == 404


def test_test_detail_404_when_missing(client):
    assert client.get("/api/v1/tests/999").status_code == 404


def test_security_detail_404_when_missing(client):
    assert client.get("/api/v1/security/999").status_code == 404


def test_release_detail_404_when_missing(client):
    assert client.get("/api/v1/releases/999").status_code == 404


# ── Populated after analyze (static mode) ─────────────────────────────────────


def test_analyze_persists_patch_test_security_release_rows(client, monkeypatch):
    issue_id = _connect_and_analyze(client, monkeypatch)

    patches = client.get("/api/v1/patches").json()
    assert len(patches) == 1
    assert patches[0]["issue_id"] == issue_id
    assert patches[0]["repository_full_name"] == "acme/widget"
    assert patches[0]["issue_number"] == 7
    assert patches[0]["mode"] == "static"
    assert patches[0]["status"] in {"Generated", "Needs Review"}

    tests = client.get("/api/v1/tests").json()
    assert len(tests) == 1
    assert tests[0]["execution_status"] in {
        "Generated — Not Executed",
        "Not Generated",
        "Executed — Passed",
        "Executed — Failed",
        "Validation Unavailable",
    }
    assert tests[0]["issue_number"] == 7

    findings = client.get("/api/v1/security").json()
    assert len(findings) >= 1
    # The hardcoded secret must be flagged as critical and blocking.
    assert any(f["severity"] == "critical" and f["blocking"] is True for f in findings)

    releases = client.get("/api/v1/releases").json()
    assert len(releases) == 1
    assert releases[0]["human_approval_required"] is True
    # Critical security finding must block release readiness end-to-end.
    assert releases[0]["release_ready"] is False
    assert releases[0]["status"] == "blocked"


def test_patch_detail_matches_list_entry(client, monkeypatch):
    _connect_and_analyze(client, monkeypatch)
    patch_id = client.get("/api/v1/patches").json()[0]["id"]

    detail = client.get(f"/api/v1/patches/{patch_id}")
    assert detail.status_code == 200
    assert detail.json()["id"] == patch_id


def test_filter_patches_by_repository_id(client, monkeypatch):
    issue_id = _connect_and_analyze(client, monkeypatch)
    repo_id = client.get(f"/api/v1/issues/{issue_id}").json()["repository_id"]

    filtered = client.get(f"/api/v1/patches?repository_id={repo_id}")
    assert filtered.status_code == 200
    assert len(filtered.json()) == 1

    empty = client.get("/api/v1/patches?repository_id=999999")
    assert empty.json() == []
