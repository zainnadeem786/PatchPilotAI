"""API endpoints for issue operations under /api/v1/issues."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.issue import IssueResponse
from app.schemas.agent import EngineResultResponse
from app.services.issue_service import issue_service
from app.services.agent_engine_service import agent_engine_service, AgentEngineNotFoundError

router = APIRouter()


@router.get(
    "",
    response_model=List[IssueResponse],
    summary="List tracked issues",
    description="Retrieve all tracked repository issues across all connected repositories with optional filters.",
)
def list_issues(
    repository_id: Optional[int] = Query(None, description="Filter issues by repository ID"),
    state: Optional[str] = Query(None, description="Filter issues by state: 'open' or 'closed'"),
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of issues to return"),
    db: Session = Depends(get_db),
):
    return issue_service.list_issues(
        db,
        repository_id=repository_id,
        state=state,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{issue_id}",
    response_model=IssueResponse,
    summary="Get issue details",
    description="Retrieve a specific issue by its primary key ID.",
)
def get_issue(
    issue_id: int,
    db: Session = Depends(get_db),
):
    issue = issue_service.get_issue(db, issue_id)
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Issue with ID {issue_id} was not found.",
        )
    return issue


@router.post(
    "/{issue_id}/analyze",
    response_model=EngineResultResponse,
    summary="Run the AI Agent Engine against an issue",
    description=(
        "Executes the Phase 4 multi-agent pipeline (triage, repository intelligence, "
        "patch synthesis, regression test synthesis, security audit) for a tracked "
        "issue and returns the aggregated findings. Runs in deterministic static mode "
        "unless AI_MODE=llm is configured."
    ),
)
async def analyze_issue(
    issue_id: int,
    db: Session = Depends(get_db),
):
    try:
        return await agent_engine_service.analyze_issue(db, issue_id)
    except AgentEngineNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
