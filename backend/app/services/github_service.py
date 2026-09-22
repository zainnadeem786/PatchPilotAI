"""GitHub REST API service abstraction and error normalization."""

import re
import urllib.parse
from typing import Optional, List, Dict, Any, Union, Tuple
import httpx
from app.core.config import settings


# ------------------------------------------------------------------------------
# Typed GitHub Service Exceptions
# ------------------------------------------------------------------------------

class GitHubServiceError(Exception):
    """Base exception for all GitHub service errors."""
    pass


class GitHubConfigurationError(GitHubServiceError):
    """Raised when GitHub OAuth or integration credentials are unconfigured."""
    pass


class GitHubValidationError(GitHubServiceError):
    """Raised when repository owner or name fails strict identifier validation."""
    pass


class GitHubNotFoundError(GitHubServiceError):
    """Raised when a requested repository, issue, or path is not found (404)."""
    pass


class GitHubRateLimitError(GitHubServiceError):
    """Raised when GitHub API rate limits are exhausted (403)."""
    pass


class GitHubAuthError(GitHubServiceError):
    """Raised when GitHub authentication credentials are invalid or expired (401)."""
    pass


class GitHubAPIError(GitHubServiceError):
    """Raised when GitHub returns an unexpected API or upstream error."""
    pass


# ------------------------------------------------------------------------------
# Input Validation (SSRF & Path Traversal Safeguards)
# ------------------------------------------------------------------------------

IDENTIFIER_PATTERN = re.compile(r"^[a-zA-Z0-9_.-]+$")
IPV4_PATTERN = re.compile(r"^(\d{1,3}\.){3}\d{1,3}$")
DISALLOWED_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0", "internal", "loopback", ".", ".."}


def validate_repo_identifier(owner: str, name: str) -> None:
    """Validate repository owner and name against strict GitHub format.

    Rejects arbitrary URLs, scheme prefixes, IP addresses, and directory traversal sequences.
    """
    if not owner or not IDENTIFIER_PATTERN.match(owner):
        raise GitHubValidationError(
            f"Invalid repository owner identifier: '{owner}'. Only alphanumeric characters, hyphens, dots, and underscores are allowed."
        )

    if not name or not IDENTIFIER_PATTERN.match(name):
        raise GitHubValidationError(
            f"Invalid repository name identifier: '{name}'. Only alphanumeric characters, hyphens, dots, and underscores are allowed."
        )

    lower_owner = owner.lower()
    lower_name = name.lower()

    if lower_owner in DISALLOWED_HOSTS or lower_name in DISALLOWED_HOSTS:
        raise GitHubValidationError(f"Reserved or loopback identifier not allowed: '{owner}' / '{name}'.")

    if IPV4_PATTERN.match(owner) or IPV4_PATTERN.match(name):
        raise GitHubValidationError(f"IP addresses are not valid GitHub repository identifiers: '{owner}' / '{name}'.")


# ------------------------------------------------------------------------------
# GitHub Service Client
# ------------------------------------------------------------------------------

class GitHubService:
    """HTTP client service for GitHub REST API communication."""

    def __init__(
        self,
        base_url: str = settings.GITHUB_API_BASE_URL,
        timeout: float = 10.0,
    ):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def _get_headers(self, token: Optional[str] = None) -> Dict[str, str]:
        """Construct secure request headers. Does not log tokens."""
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "PatchPilot-AI-Platform",
        }
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers

    def _handle_response_error(self, response: httpx.Response, owner: str, name: str) -> None:
        """Map HTTP error status codes into typed domain exceptions."""
        status = response.status_code
        if status == 404:
            raise GitHubNotFoundError(
                f"Repository '{owner}/{name}' was not found on GitHub."
            )
        elif status == 401:
            raise GitHubAuthError(
                "GitHub authentication failed. Check configured access credentials."
            )
        elif status == 403:
            remaining = response.headers.get("x-ratelimit-remaining")
            if remaining == "0":
                raise GitHubRateLimitError(
                    "GitHub API rate limit exceeded. Please wait or authenticate with a token."
                )
            raise GitHubAuthError(
                "Access to GitHub resource forbidden. Insufficient scope or permissions."
            )
        elif status == 422:
            raise GitHubAPIError(
                f"GitHub validation failed: {response.text[:200]}"
            )
        elif status >= 500:
            raise GitHubAPIError(
                f"GitHub upstream service error (HTTP {status})."
            )
        else:
            raise GitHubAPIError(
                f"GitHub API returned error HTTP {status}: {response.text[:200]}"
            )

    async def get_repository(
        self,
        owner: str,
        name: str,
        token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Retrieve repository metadata from GitHub.

        Raises:
            GitHubValidationError: If owner/name fails format validation.
            GitHubNotFoundError: If repository is not found (404).
            GitHubRateLimitError: If rate limit exceeded (403).
            GitHubAuthError: If unauthorized (401).
            GitHubAPIError: On other upstream errors.
        """
        validate_repo_identifier(owner, name)
        url = f"{self.base_url}/repos/{owner}/{name}"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(url, headers=self._get_headers(token))
            except httpx.TimeoutException:
                raise GitHubAPIError(f"Connection to GitHub timed out while requesting '{owner}/{name}'.")
            except httpx.RequestError as exc:
                raise GitHubAPIError(f"Network error connecting to GitHub: {str(exc)}")

        if not response.is_success:
            self._handle_response_error(response, owner, name)

        return response.json()

    async def get_repository_counts(
        self,
        owner: str,
        name: str,
        combined_count: int,
        token: Optional[str] = None,
    ) -> Tuple[int, int]:
        """Calculate separated actual open issue count and open PR count.

        GitHub's repo.open_issues_count combines both open issues and PRs.
        We query /repos/{owner}/{name}/pulls?state=open&per_page=1 to extract
        the exact PR count from the Link header with minimal network overhead.

        Returns:
            Tuple[int, int]: (open_issues_count, open_pull_requests_count)
        """
        validate_repo_identifier(owner, name)
        url = f"{self.base_url}/repos/{owner}/{name}/pulls"
        params = {"state": "open", "per_page": 1}

        pr_count = 0
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(url, headers=self._get_headers(token), params=params)
                if response.is_success:
                    pulls_data = response.json()
                    if not pulls_data:
                        pr_count = 0
                    else:
                        link_header = response.headers.get("link", "")
                        # Check for rel="last" pagination link: <https://...page=81...>; rel="last"
                        match = re.search(r'[?&]page=(\d+)[^>]*>;\s*rel=["\']last["\']', link_header)
                        if match:
                            pr_count = int(match.group(1))
                        else:
                            pr_count = len(pulls_data)
            except Exception:
                pr_count = 0

        issue_count = max(0, combined_count - pr_count)
        return issue_count, pr_count

    async def list_repository_issues(
        self,
        owner: str,
        name: str,
        state: str = "open",
        token: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieve repository issues from GitHub (excluding pull requests).

        Attempts to fetch via GitHub Search API (is:issue) for precision without
        wasting requests on PRs. Falls back to /repos/{owner}/{name}/issues if Search
        is unavailable or rate-limited.
        """
        validate_repo_identifier(owner, name)

        # 1. Try Search API first (targeted directly at issues, excluding PRs)
        try:
            search_url = f"{self.base_url}/search/issues"
            search_params = {"q": f"repo:{owner}/{name} is:issue state:{state}", "per_page": 50}
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(search_url, headers=self._get_headers(token), params=search_params)
                if resp.status_code == 200:
                    data = resp.json()
                    items = data.get("items", [])
                    if items:
                        return [it for it in items if "pull_request" not in it]
        except Exception:
            pass

        # 2. Fallback: Query /repos/{owner}/{name}/issues with pagination support
        url = f"{self.base_url}/repos/{owner}/{name}/issues"
        real_issues: List[Dict[str, Any]] = []
        page = 1
        max_pages = 3

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            while page <= max_pages:
                params = {"state": state, "per_page": 50, "page": page}
                try:
                    response = await client.get(url, headers=self._get_headers(token), params=params)
                except httpx.TimeoutException:
                    raise GitHubAPIError(f"Connection to GitHub timed out while requesting issues for '{owner}/{name}'.")
                except httpx.RequestError as exc:
                    raise GitHubAPIError(f"Network error connecting to GitHub: {str(exc)}")

                if not response.is_success:
                    if page == 1:
                        self._handle_response_error(response, owner, name)
                    break

                items = response.json()
                if not items or not isinstance(items, list):
                    break

                for it in items:
                    if "pull_request" not in it:
                        real_issues.append(it)

                if real_issues or len(items) < 50:
                    break
                page += 1

        return real_issues

    async def get_repository_contents(
        self,
        owner: str,
        name: str,
        path: str = "",
        token: Optional[str] = None,
    ) -> Union[List[Dict[str, Any]], Dict[str, Any]]:
        """Retrieve file or directory metadata from GitHub repository tree."""
        validate_repo_identifier(owner, name)
        # Clean path: eliminate leading slashes, reject directory traversal
        clean_path = path.strip("/").replace("\\", "/")
        if ".." in clean_path.split("/"):
            raise GitHubValidationError("Path traversal sequences ('..') are not allowed in file paths.")

        endpoint = f"/repos/{owner}/{name}/contents/{clean_path}".rstrip("/")
        url = f"{self.base_url}{endpoint}"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(url, headers=self._get_headers(token))
            except httpx.TimeoutException:
                raise GitHubAPIError(f"Connection to GitHub timed out while requesting contents for '{owner}/{name}'.")
            except httpx.RequestError as exc:
                raise GitHubAPIError(f"Network error connecting to GitHub: {str(exc)}")

        if not response.is_success:
            self._handle_response_error(response, owner, name)

        return response.json()

    def get_oauth_authorization_url(self, state: str) -> str:
        """Construct GitHub OAuth authorization URL.

        Raises GitHubConfigurationError if GITHUB_CLIENT_ID is not set.
        """
        if not settings.GITHUB_CLIENT_ID:
            raise GitHubConfigurationError(
                "GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in environment."
            )

        params = {
            "client_id": settings.GITHUB_CLIENT_ID,
            "redirect_uri": settings.GITHUB_REDIRECT_URI,
            "scope": "repo,read:user",
            "state": state,
        }
        return f"https://github.com/login/oauth/authorize?{urllib.parse.urlencode(params)}"

    async def exchange_code_for_token(self, code: str) -> str:
        """Exchange temporary OAuth authorization code for an access token.

        Raises GitHubConfigurationError if credentials are not configured.
        """
        if not settings.github_configured:
            raise GitHubConfigurationError(
                "GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in environment."
            )

        url = "https://github.com/login/oauth/access_token"
        payload = {
            "client_id": settings.GITHUB_CLIENT_ID,
            "client_secret": settings.GITHUB_CLIENT_SECRET,
            "code": code,
            "redirect_uri": settings.GITHUB_REDIRECT_URI,
        }
        headers = {"Accept": "application/json"}

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
            except httpx.RequestError as exc:
                raise GitHubAPIError(f"Failed to communicate with GitHub OAuth token endpoint: {str(exc)}")

        if not response.is_success:
            raise GitHubAuthError(f"GitHub OAuth code exchange failed with HTTP {response.status_code}.")

        data = response.json()
        if "error" in data:
            error_desc = data.get("error_description", data["error"])
            raise GitHubAuthError(f"GitHub OAuth error: {error_desc}")

        access_token = data.get("access_token")
        if not access_token:
            raise GitHubAuthError("GitHub response did not contain an access_token.")

        return access_token


# Singleton service instance
github_service = GitHubService()
