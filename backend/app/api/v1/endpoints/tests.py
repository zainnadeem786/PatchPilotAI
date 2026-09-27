"""API endpoints for persisted regression test artifacts under /api/v1/tests."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.regression_test import RegressionTest
from app.schemas.regression_test import RegressionTestResponse
from app.services.regression_test_service import regression_test_service

router = APIRouter()


def _to_response(test: RegressionTest) -> RegressionTestResponse:
    return RegressionTestResponse(
        id=test.id,
        analysis_run_id=test.analysis_run_id,
        repository_id=test.repository_id,
        issue_id=test.issue_id,
        repository_full_name=test.repository.full_name if test.repository else None,
        issue_number=test.issue.number if test.issue else None,
        issue_title=test.issue.title if test.issue else None,
        mode=test.mode,
        status=test.status,
        execution_status=test.execution_status,
        review_status=test.review_status,
        test_file=test.test_file,
        purpose=test.purpose,
        reproduction_scenario=test.reproduction_scenario,
        expected_behavior=test.expected_behavior,
        test_code=test.test_code,
        created_at=test.created_at,
    )


@router.get(
    "",
    response_model=List[RegressionTestResponse],
    summary="List persisted regression test artifacts",
    description=(
        "Retrieve PatchPilot-generated regression tests. These are PatchPilot's own "
        "generated-test artifacts, not backend pytest suite results — none have been "
        "executed unless explicitly noted."
    ),
)
def list_tests(
    repository_id: Optional[int] = Query(None, description="Filter by repository ID"),
    issue_id: Optional[int] = Query(None, description="Filter by issue ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
):
    tests = regression_test_service.list_tests(db, repository_id=repository_id, issue_id=issue_id, skip=skip, limit=limit)
    return [_to_response(t) for t in tests]


@router.get(
    "/{test_id}",
    response_model=RegressionTestResponse,
    summary="Get a persisted regression test artifact",
    description="Retrieve a single regression test artifact by its database ID.",
)
def get_test(test_id: int, db: Session = Depends(get_db)):
    test = regression_test_service.get_test(db, test_id)
    if not test:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Test with ID {test_id} was not found.")
    return _to_response(test)
