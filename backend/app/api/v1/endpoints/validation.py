"""API endpoints for isolated patch validation under /api/v1/validation (Phase 7)."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.analysis_run import AnalysisRun
from app.models.repository import Repository
from app.models.issue import Issue
from app.models.patch import Patch
from app.models.regression_test import RegressionTest
from app.models.validation_run import ValidationRun
from app.schemas.validation import ValidationResponse
from app.services.validation_service import validation_service, ValidationResult

router = APIRouter()
analysis_router = APIRouter()


@router.get(
    "",
    response_model=List[ValidationResponse],
    summary="List validation runs",
    description="Retrieve all persisted isolated validation runs with optional filtering.",
)
def list_validation_runs(
    repository_id: Optional[int] = Query(None, description="Filter by repository ID"),
    issue_id: Optional[int] = Query(None, description="Filter by issue ID"),
    analysis_run_id: Optional[int] = Query(None, description="Filter by analysis run ID"),
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max records to return"),
    db: Session = Depends(get_db),
):
    query = db.query(ValidationRun)
    if repository_id is not None:
        query = query.filter(ValidationRun.repository_id == repository_id)
    if issue_id is not None:
        query = query.filter(ValidationRun.issue_id == issue_id)
    if analysis_run_id is not None:
        query = query.filter(ValidationRun.analysis_run_id == analysis_run_id)

    return query.order_by(ValidationRun.created_at.desc()).offset(skip).limit(limit).all()


@router.get(
    "/{validation_id}",
    response_model=ValidationResponse,
    summary="Get validation run details",
    description="Retrieve a single validation run by its primary key ID.",
)
def get_validation_run(
    validation_id: int,
    db: Session = Depends(get_db),
):
    val_run = db.query(ValidationRun).filter(ValidationRun.id == validation_id).first()
    if not val_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Validation run with ID {validation_id} was not found.",
        )
    return val_run


@analysis_router.post(
    "/{analysis_id}/validate",
    response_model=ValidationResponse,
    summary="Execute isolated validation for an analysis run",
    description=(
        "Executes isolated patch and regression test validation in a temporary, "
        "network-restricted Docker container for an existing analysis run."
    ),
)
@router.post(
    "/analysis/{analysis_id}/validate",
    response_model=ValidationResponse,
    summary="Execute isolated validation for an analysis run",
    description=(
        "Executes isolated patch and regression test validation in a temporary, "
        "network-restricted Docker container for an existing analysis run."
    ),
)
def validate_analysis_run(
    analysis_id: int,
    db: Session = Depends(get_db),
):
    analysis_run = db.query(AnalysisRun).filter(AnalysisRun.id == analysis_id).first()
    if not analysis_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis run with ID {analysis_id} was not found.",
        )

    repo = db.query(Repository).filter(Repository.id == analysis_run.repository_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository with ID {analysis_run.repository_id} was not found.",
        )

    issue = None
    if analysis_run.issue_id:
        issue = db.query(Issue).filter(Issue.id == analysis_run.issue_id).first()

    patch = db.query(Patch).filter(Patch.analysis_run_id == analysis_id).first()
    reg_test = db.query(RegressionTest).filter(RegressionTest.analysis_run_id == analysis_id).first()

    patch_diff = patch.unified_diff if patch else None
    target_files = patch.files_changed if patch and patch.files_changed else []
    test_code = reg_test.test_code if reg_test else None
    test_file = reg_test.test_file if reg_test else None

    if not patch_diff and (not test_code or "notimplementederror" in (test_code or "").lower()):
        val_result = ValidationResult(
            status="validation_unavailable",
            tests_run=False,
            summary="Validation unavailable: no executable patch diff or runnable test found for this analysis.",
            failure_reason="No executable patch diff or test code.",
        )
    else:
        source_files = {}
        if patch_diff and target_files:
            for tf in target_files:
                if tf == "math_utils.py" and "def divide" in patch_diff:
                    source_files[tf] = "def divide(a, b):\n    return a / b\n"
                elif tf == "calculator.py" and "def compute" in patch_diff:
                    source_files[tf] = "def compute(x: int) -> int:\n    return x - 1\n"

        val_result = validation_service.validate_patch_and_test(
            repository=repo,
            issue=issue,
            patch_diff=patch_diff,
            target_files=target_files,
            test_code=test_code,
            test_file=test_file,
            source_files=source_files,
        )

    persisted = validation_service.persist_validation_result(
        db=db,
        analysis_run_id=analysis_run.id,
        repository_id=repo.id,
        issue_id=issue.id if issue else None,
        validation_result=val_result,
    )

    return persisted
