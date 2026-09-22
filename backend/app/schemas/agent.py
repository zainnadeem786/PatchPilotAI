"""Pydantic schemas for AI Agent Engine API responses."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class AgentFindingResponse(BaseModel):
    """Response schema for a single finding surfaced by an agent."""

    title: str
    detail: str
    severity: str
    category: Optional[str] = None
    file_path: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AgentResultResponse(BaseModel):
    """Response schema for a single pipeline agent's result."""

    agent_name: str
    status: str
    mode: str
    summary: str
    findings: List[AgentFindingResponse] = []
    data: Dict[str, Any] = {}
    error: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EngineResultResponse(BaseModel):
    """Response schema for the aggregated output of a full AI Agent Engine pipeline run."""

    repository_id: int
    issue_id: Optional[int] = None
    results: List[AgentResultResponse]
    roadmap: List[str] = []

    model_config = ConfigDict(from_attributes=True)
