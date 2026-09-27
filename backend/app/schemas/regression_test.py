"""Pydantic schemas for persisted Regression Test Synthesis Agent results."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class RegressionTestResponse(BaseModel):
    """Response schema for a single persisted regression test artifact."""

    id: int
    analysis_run_id: int
    repository_id: int
    issue_id: Optional[int] = None
    repository_full_name: Optional[str] = None
    issue_number: Optional[int] = None
    issue_title: Optional[str] = None

    mode: str
    status: str
    execution_status: str
    review_status: str

    test_file: Optional[str] = None
    purpose: Optional[str] = None
    reproduction_scenario: Optional[str] = None
    expected_behavior: Optional[str] = None
    test_code: Optional[str] = None

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
