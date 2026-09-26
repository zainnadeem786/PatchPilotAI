"""API endpoints for persisted release-readiness evaluations under /api/v1/releases."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.release_readiness import ReleaseReadiness
from app.schemas.release import ReleaseReadinessResponse
from app.services.release_readiness_service import release_readiness_service

router = APIRouter()


def _to_response(release: ReleaseReadiness) -> ReleaseReadinessResponse:
    return ReleaseReadinessResponse(
        id=release.id,
        analysis_run_id=release.analysis_run_id,
        repository_id=release.repository_id,
        issue_id=release.issue_id,
        repository_full_name=release.repository.full_name if release.repository else None,
        issue_number=release.issue.number if release.issue else None,
        issue_title=release.issue.title if release.issue else None,
        mode=release.mode,
        release_ready=release.release_ready,
        status=release.status,
        blocking_reasons=release.blocking_reasons or [],
        warnings=release.warnings or [],
        gate_checks=release.gate_checks or [],
        human_approval_required=release.human_approval_required,
        created_at=release.created_at,
    )


@router.get(
    "",
    response_model=List[ReleaseReadinessResponse],
    summary="List persisted release-readiness evaluations",
    description=(
        "Retrieve release-readiness evaluations produced by the Release Agent. "
        "`human_approval_required` is always true — PatchPilot never commits, "
        "pushes, merges, or deploys automatically."
    ),
)
def list_releases(
    repository_id: Optional[int] = Query(None, description="Filter by repository ID"),
    issue_id: Optional[int] = Query(None, description="Filter by issue ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
):
    releases = release_readiness_service.list_releases(
        db, repository_id=repository_id, issue_id=issue_id, skip=skip, limit=limit
    )
    return [_to_response(r) for r in releases]


@router.get(
    "/{release_id}",
    response_model=ReleaseReadinessResponse,
    summary="Get a persisted release-readiness evaluation",
    description="Retrieve a single release-readiness evaluation by its database ID.",
)
def get_release(release_id: int, db: Session = Depends(get_db)):
    release = release_readiness_service.get_release(db, release_id)
    if not release:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Release with ID {release_id} was not found.")
    return _to_response(release)
