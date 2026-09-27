"""API endpoints for persisted security findings under /api/v1/security."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.security_finding import SecurityFinding
from app.schemas.security import SecurityFindingResponse
from app.services.security_finding_service import security_finding_service

router = APIRouter()


def _to_response(finding: SecurityFinding) -> SecurityFindingResponse:
    return SecurityFindingResponse(
        id=finding.id,
        analysis_run_id=finding.analysis_run_id,
        repository_id=finding.repository_id,
        issue_id=finding.issue_id,
        repository_full_name=finding.repository.full_name if finding.repository else None,
        issue_number=finding.issue.number if finding.issue else None,
        issue_title=finding.issue.title if finding.issue else None,
        mode=finding.mode,
        severity=finding.severity,
        title=finding.title,
        detail=finding.detail,
        affected_area=finding.affected_area,
        blocking=finding.blocking,
        created_at=finding.created_at,
    )


@router.get(
    "",
    response_model=List[SecurityFindingResponse],
    summary="List persisted security findings",
    description=(
        "Retrieve findings produced by the Security Audit Agent. Severity and the "
        "blocking flag are always derived from the deterministic CWE/OWASP regex "
        "screen — never from LLM narrative text alone."
    ),
)
def list_security_findings(
    repository_id: Optional[int] = Query(None, description="Filter by repository ID"),
    issue_id: Optional[int] = Query(None, description="Filter by issue ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
):
    findings = security_finding_service.list_findings(
        db, repository_id=repository_id, issue_id=issue_id, skip=skip, limit=limit
    )
    return [_to_response(f) for f in findings]


@router.get(
    "/{finding_id}",
    response_model=SecurityFindingResponse,
    summary="Get a persisted security finding",
    description="Retrieve a single security finding by its database ID.",
)
def get_security_finding(finding_id: int, db: Session = Depends(get_db)):
    finding = security_finding_service.get_finding(db, finding_id)
    if not finding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Security finding with ID {finding_id} was not found.")
    return _to_response(finding)
