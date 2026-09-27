"""API endpoints for issue operations under /api/v1/issues."""

import math
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.issue import Issue
from app.schemas.issue import IssueResponse, PaginatedIssueResponse
from app.schemas.agent import EngineResultResponse
from app.services.issue_service import issue_service
from app.services.repository_service import repository_service
from app.services.github_service import github_service
from app.services.agent_engine_service import agent_engine_service, AgentEngineNotFoundError

router = APIRouter()


@router.get(
    "",
    response_model=PaginatedIssueResponse,
    summary="List tracked issues with server-side pagination",
    description="Retrieve tracked repository issues across all connected repositories with server-side pagination.",
)
async def list_issues(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    per_page: int = Query(50, ge=1, le=100, description="Maximum number of issues per page"),
    state: Optional[str] = Query(None, description="Filter issues by state: 'open' or 'closed'"),
    repository_id: Optional[int] = Query(None, description="Filter issues by repository ID"),
    db: Session = Depends(get_db),
):
    items = []
    total = 0

    if repository_id is not None:
        repo = repository_service.get_repository(db, repository_id)
        if not repo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Repository with ID {repository_id} was not found.",
            )

        github_items = None
        total_count = None
        try:
            github_items, total_count = await github_service.fetch_repository_issues_paginated(
                owner=repo.owner,
                name=repo.name,
                state=state or "open",
                page=page,
                per_page=per_page,
            )
            if github_items:
                issue_service.sync_issues_for_repository(db, repo.id, github_items)
            if total_count is not None and total_count > 0 and (state == "open" or state is None):
                repo.open_issues_count = total_count
                db.commit()
        except Exception:
            pass

        if github_items is not None and len(github_items) > 0:
            numbers = [it["number"] for it in github_items]
            db_issues = (
                db.query(Issue)
                .filter(Issue.repository_id == repo.id, Issue.number.in_(numbers))
                .all()
            )
            issue_map = {i.number: i for i in db_issues}
            items = [issue_map[n] for n in numbers if n in issue_map]
            total = total_count if total_count is not None else (repo.open_issues_count or len(items))
        else:
            items, db_total = issue_service.list_issues_paginated(
                db, repository_id=repo.id, state=state, page=page, per_page=per_page
            )
            total = repo.open_issues_count if (repo.open_issues_count and (state == "open" or state is None)) else db_total
    else:
        repos = repository_service.list_repositories(db)
        if not repos:
            return PaginatedIssueResponse(
                items=[],
                page=page,
                per_page=per_page,
                total=0,
                total_pages=0,
                has_next=False,
                has_previous=False,
            )

        repo_total = sum(r.open_issues_count for r in repos if r.open_issues_count is not None)
        db_total = issue_service.count_issues(db, state=state)
        total = max(repo_total, db_total) if (state == "open" or state is None) else db_total
        items, _ = issue_service.list_issues_paginated(
            db, repository_id=None, state=state, page=page, per_page=per_page
        )

    total_pages = math.ceil(total / per_page) if total > 0 else 0
    has_next = page < total_pages
    has_previous = page > 1 and total_pages > 0

    return PaginatedIssueResponse(
        items=items,
        page=page,
        per_page=per_page,
        total=total,
        total_pages=total_pages,
        has_next=has_next,
        has_previous=has_previous,
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
