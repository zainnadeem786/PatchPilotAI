"""Tests for GitHubService abstraction, input validation, and error normalization."""

import pytest
import httpx
from app.services.github_service import (
    GitHubService,
    validate_repo_identifier,
    GitHubValidationError,
    GitHubNotFoundError,
    GitHubRateLimitError,
    GitHubAuthError,
    GitHubAPIError,
    GitHubConfigurationError,
)


def test_validate_repo_identifier_valid():
    """Verify valid GitHub identifiers pass validation."""
    for valid_owner in ("octocat", "acme-corp", "patch_pilot", "user.name"):
        for valid_repo in ("Hello-World", "api.v1", "core_engine", "repo-123"):
            validate_repo_identifier(valid_owner, valid_repo)


def test_validate_repo_identifier_invalid():
    """Verify invalid identifiers (URLs, paths, traversal, special chars) are rejected."""
    invalid_cases = [
        ("http://bad.com", "repo"),
        ("https://github.com/octocat/repo", "repo"),
        ("..", "repo"),
        ("octocat", ".."),
        ("octocat/slash", "repo"),
        ("octocat", "repo/slash"),
        ("127.0.0.1", "repo"),
        ("localhost", "repo"),
        ("", "repo"),
        ("octocat", ""),
        ("@octocat", "repo"),
        ("octocat", "repo$name"),
    ]
    for owner, repo in invalid_cases:
        with pytest.raises(GitHubValidationError):
            validate_repo_identifier(owner, repo)


@pytest.mark.anyio
async def test_github_service_get_repository_success(monkeypatch):
    """Verify successful parsing of GitHub repository response."""
    service = GitHubService()

    sample_payload = {
        "id": 42,
        "name": "demo-repo",
        "full_name": "acme/demo-repo",
        "owner": {"login": "acme"},
    }

    async def mock_get(self, url, **kwargs):
        return httpx.Response(200, json=sample_payload, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    result = await service.get_repository("acme", "demo-repo")
    assert result["id"] == 42
    assert result["full_name"] == "acme/demo-repo"


@pytest.mark.anyio
async def test_github_service_get_repository_404_mapping(monkeypatch):
    """Verify HTTP 404 maps to GitHubNotFoundError."""
    service = GitHubService()

    async def mock_get(self, url, **kwargs):
        return httpx.Response(404, json={"message": "Not Found"}, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    with pytest.raises(GitHubNotFoundError):
        await service.get_repository("acme", "ghost-repo")


@pytest.mark.anyio
async def test_github_service_get_repository_rate_limit_mapping(monkeypatch):
    """Verify HTTP 403 with x-ratelimit-remaining=0 maps to GitHubRateLimitError."""
    service = GitHubService()

    async def mock_get(self, url, **kwargs):
        headers = {"x-ratelimit-remaining": "0"}
        return httpx.Response(
            403,
            headers=headers,
            json={"message": "API rate limit exceeded"},
            request=httpx.Request("GET", url),
        )

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    with pytest.raises(GitHubRateLimitError):
        await service.get_repository("acme", "demo-repo")


@pytest.mark.anyio
async def test_github_service_get_repository_timeout_mapping(monkeypatch):
    """Verify HTTP timeout maps to GitHubAPIError."""
    service = GitHubService()

    async def mock_get(self, url, **kwargs):
        raise httpx.TimeoutException("Read timed out")

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    with pytest.raises(GitHubAPIError) as excinfo:
        await service.get_repository("acme", "demo-repo")
    assert "timed out" in str(excinfo.value).lower()


def test_github_service_oauth_unconfigured():
    """Verify get_oauth_authorization_url raises GitHubConfigurationError when unconfigured."""
    service = GitHubService()
    with pytest.raises(GitHubConfigurationError):
        service.get_oauth_authorization_url(state="test-state")


@pytest.mark.anyio
async def test_github_service_list_repository_issues_filters_pull_requests(monkeypatch):
    """Verify list_repository_issues filters out GitHub pull requests."""
    service = GitHubService()

    raw_response_data = [
        {
            "id": 901,
            "number": 1,
            "title": "Real Issue",
            "state": "open",
            "body": "Issue details",
            "user": {"login": "octocat"},
        },
        {
            "id": 902,
            "number": 2,
            "title": "A Pull Request",
            "state": "open",
            "body": "PR details",
            "user": {"login": "contributor"},
            "pull_request": {
                "url": "https://api.github.com/repos/octocat/Hello-World/pulls/2",
                "html_url": "https://github.com/octocat/Hello-World/pull/2",
            },
        },
    ]

    async def mock_get(self, url, **kwargs):
        return httpx.Response(200, json=raw_response_data, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    filtered = await service.list_repository_issues("octocat", "Hello-World")
    assert len(filtered) == 1
    assert filtered[0]["id"] == 901
    assert filtered[0]["number"] == 1
    assert "pull_request" not in filtered[0]


@pytest.mark.anyio
async def test_get_repository_counts_with_link_header(monkeypatch):
    """Verify get_repository_counts extracts PR count from Link header rel=last."""
    service = GitHubService()

    link_header = '<https://api.github.com/repositories/160919119/pulls?state=open&per_page=1&page=2>; rel="next", <https://api.github.com/repositories/160919119/pulls?state=open&per_page=1&page=81>; rel="last"'

    async def mock_get(self, url, **kwargs):
        return httpx.Response(
            200,
            json=[{"id": 1, "number": 100}],
            headers={"link": link_header},
            request=httpx.Request("GET", url),
        )

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    issues_cnt, prs_cnt = await service.get_repository_counts("fastapi", "fastapi", combined_count=82)
    assert prs_cnt == 81
    assert issues_cnt == 1


@pytest.mark.anyio
async def test_get_repository_counts_no_prs(monkeypatch):
    """Verify get_repository_counts handles 0 pull requests correctly."""
    service = GitHubService()

    async def mock_get(self, url, **kwargs):
        return httpx.Response(200, json=[], request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    issues_cnt, prs_cnt = await service.get_repository_counts("octocat", "Hello-World", combined_count=5)
    assert prs_cnt == 0
    assert issues_cnt == 5


@pytest.mark.anyio
async def test_get_repository_counts_single_pr(monkeypatch):
    """Verify get_repository_counts handles 1 PR without rel=last Link header."""
    service = GitHubService()

    async def mock_get(self, url, **kwargs):
        return httpx.Response(
            200,
            json=[{"id": 1, "number": 10}],
            headers={},
            request=httpx.Request("GET", url),
        )

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    issues_cnt, prs_cnt = await service.get_repository_counts("owner", "repo", combined_count=3)
    assert prs_cnt == 1
    assert issues_cnt == 2


