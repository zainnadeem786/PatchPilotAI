"""Pydantic schemas for isolated patch validation and test execution (Phase 7)."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class ValidationRequest(BaseModel):
    """Request payload to validate a patch and regression test in isolation."""

    repository_id: int = Field(..., description="ID of the repository being analyzed")
    analysis_run_id: Optional[int] = Field(None, description="Optional ID of associated analysis run")
    issue_id: Optional[int] = Field(None, description="Optional ID of associated issue")
    patch_diff: Optional[str] = Field(None, description="Unified diff string of the proposed patch")
    target_files: Optional[List[str]] = Field(default_factory=list, description="Target files affected by patch")
    test_code: Optional[str] = Field(None, description="Generated regression test source code")
    test_file: Optional[str] = Field(None, description="Relative file path for the test")
    test_framework: Optional[str] = Field("pytest", description="Test framework (e.g. pytest)")
    test_command: Optional[str] = Field(None, description="Explicit test command override (restricted)")
    language: Optional[str] = Field("python", description="Repository primary programming language")
    source_files: Optional[Dict[str, str]] = Field(
        default_factory=dict, description="Pre-existing source file contents (filename -> content)"
    )
    timeout_seconds: Optional[int] = Field(None, description="Execution timeout override")


class ValidationResponse(BaseModel):
    """API response model representing a persisted or live validation run."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = Field(None, description="Validation run primary key")
    analysis_run_id: int = Field(..., description="Associated analysis run ID")
    repository_id: int = Field(..., description="Associated repository ID")
    issue_id: Optional[int] = Field(None, description="Associated issue ID")
    status: str = Field(
        ...,
        description="Status: 'passed', 'failed', 'timeout', 'validation_unavailable', or 'setup_failed'",
    )
    tests_run: bool = Field(False, description="Whether tests were actually executed in the sandbox")
    exit_code: Optional[int] = Field(None, description="Process exit code from the sandbox")
    stdout: Optional[str] = Field("", description="Standard output from test runner (truncated)")
    stderr: Optional[str] = Field("", description="Standard error from test runner (truncated)")
    duration_ms: int = Field(0, description="Execution duration in milliseconds")
    summary: Optional[str] = Field(None, description="Concise human-readable summary of validation result")
    failure_reason: Optional[str] = Field(None, description="Detailed failure reason if validation failed")
    executed_command: Optional[str] = Field(None, description="The exact test command executed in sandbox")
    created_at: Optional[datetime] = Field(None, description="Timestamp of validation run")
