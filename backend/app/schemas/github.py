"""Pydantic schemas for GitHub service and OAuth operations."""

from typing import Optional
from pydantic import BaseModel


class GitHubContentItem(BaseModel):
    """File or directory item in a repository tree."""

    name: str
    path: str
    type: str  # "file" or "dir"
    size: Optional[int] = None
    sha: Optional[str] = None
    download_url: Optional[str] = None


class GitHubOAuthStartResponse(BaseModel):
    """Payload returned to initiate GitHub OAuth flow."""

    authorization_url: str
    state: str


class GitHubOAuthCallbackResponse(BaseModel):
    """Safe callback response payload without leaking raw credentials."""

    status: str
    message: str
    configured: bool
