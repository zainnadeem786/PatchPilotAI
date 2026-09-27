"""Pydantic schemas for persisted Security Audit Agent findings."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class SecurityFindingResponse(BaseModel):
    """Response schema for a single persisted security finding."""

    id: int
    analysis_run_id: int
    repository_id: int
    issue_id: Optional[int] = None
    repository_full_name: Optional[str] = None
    issue_number: Optional[int] = None
    issue_title: Optional[str] = None

    mode: str
    severity: str
    title: str
    detail: Optional[str] = None
    affected_area: Optional[str] = None
    blocking: bool

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
