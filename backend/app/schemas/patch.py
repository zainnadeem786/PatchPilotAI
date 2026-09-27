"""Pydantic schemas for persisted Patch Synthesis Agent results."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class PatchResponse(BaseModel):
    """Response schema for a single persisted patch proposal."""

    id: int
    analysis_run_id: int
    repository_id: int
    issue_id: Optional[int] = None
    repository_full_name: Optional[str] = None
    issue_number: Optional[int] = None
    issue_title: Optional[str] = None

    mode: str
    status: str
    review_status: str

    summary: Optional[str] = None
    files_changed: List[str] = []
    unified_diff: Optional[str] = None
    reasoning: Optional[str] = None
    risks: List[str] = []

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
