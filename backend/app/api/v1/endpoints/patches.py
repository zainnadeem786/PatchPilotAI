"""API endpoints for persisted patch proposals under /api/v1/patches."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.patch import Patch
from app.schemas.patch import PatchResponse
from app.services.patch_service import patch_service

router = APIRouter()


def _to_response(patch: Patch) -> PatchResponse:
    return PatchResponse(
        id=patch.id,
        analysis_run_id=patch.analysis_run_id,
        repository_id=patch.repository_id,
        issue_id=patch.issue_id,
        repository_full_name=patch.repository.full_name if patch.repository else None,
        issue_number=patch.issue.number if patch.issue else None,
        issue_title=patch.issue.title if patch.issue else None,
        mode=patch.mode,
        status=patch.status,
        review_status=patch.review_status,
        summary=patch.summary,
        files_changed=patch.files_changed or [],
        unified_diff=patch.unified_diff,
        reasoning=patch.reasoning,
        risks=patch.risks or [],
        created_at=patch.created_at,
    )


@router.get(
    "",
    response_model=List[PatchResponse],
    summary="List persisted patch proposals",
    description=(
        "Retrieve patch proposals produced by the Patch Synthesis Agent across all "
        "analysis runs. Patches are proposals only — none are applied, committed, or "
        "pushed automatically."
    ),
)
def list_patches(
    repository_id: Optional[int] = Query(None, description="Filter by repository ID"),
    issue_id: Optional[int] = Query(None, description="Filter by issue ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
):
    patches = patch_service.list_patches(db, repository_id=repository_id, issue_id=issue_id, skip=skip, limit=limit)
    return [_to_response(p) for p in patches]


@router.get(
    "/{patch_id}",
    response_model=PatchResponse,
    summary="Get a persisted patch proposal",
    description="Retrieve a single patch proposal by its database ID.",
)
def get_patch(patch_id: int, db: Session = Depends(get_db)):
    patch = patch_service.get_patch(db, patch_id)
    if not patch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Patch with ID {patch_id} was not found.")
    return _to_response(patch)
