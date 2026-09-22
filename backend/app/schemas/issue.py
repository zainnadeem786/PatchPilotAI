"""Pydantic schemas for issue API operations."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class IssueResponse(BaseModel):
    """Response schema for a repository issue."""

    id: int
    repository_id: int
    github_issue_id: Optional[int] = None
    number: int
    title: str
    body: Optional[str] = None
    state: str
    html_url: Optional[str] = None
    author: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
