"""Pydantic schemas for persisted Release Agent readiness evaluations."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class ReleaseReadinessResponse(BaseModel):
    """Response schema for a single persisted release-readiness evaluation."""

    id: int
    analysis_run_id: int
    repository_id: int
    issue_id: Optional[int] = None
    repository_full_name: Optional[str] = None
    issue_number: Optional[int] = None
    issue_title: Optional[str] = None

    mode: str
    release_ready: bool
    status: str
    blocking_reasons: List[str] = []
    warnings: List[str] = []
    gate_checks: List[Dict[str, Any]] = []
    human_approval_required: bool

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
