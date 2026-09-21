"""Pydantic schemas for repository API operations."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class RepositoryConnectRequest(BaseModel):
    """Payload to connect and track a GitHub repository."""

    owner: str = Field(
        ...,
        min_length=1,
        max_length=255,
        pattern=r"^[a-zA-Z0-9_.-]+$",
        description="GitHub account or organization name (alphanumeric, hyphens, dots, underscores)",
    )
    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        pattern=r"^[a-zA-Z0-9_.-]+$",
        description="GitHub repository name (alphanumeric, hyphens, dots, underscores)",
    )


class RepositoryResponse(BaseModel):
    """Response schema for a tracked repository."""

    id: int
    github_id: int
    owner: str
    name: str
    full_name: str
    description: Optional[str] = None
    default_branch: str
    private: bool
    html_url: str
    language: Optional[str] = None
    open_issues_count: int = Field(
        ...,
        description="Actual count of open GitHub issues (excluding pull requests)",
    )
    open_pull_requests_count: int = Field(
        default=0,
        description="Actual count of open GitHub pull requests",
    )
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
