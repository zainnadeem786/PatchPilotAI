"""Persists a completed AI Agent Engine pipeline run into the database.

Phase 4/5 ran the pipeline purely in-memory: `POST /issues/{id}/analyze`
returned an `EngineResult` and nothing was ever saved, so a page refresh (or
any other request) had no way to see prior analyses. Phase 6 adds the
`AnalysisRun -> {Patch, RegressionTest, SecurityFinding, ReleaseReadiness}`
persistence tree described in the architecture doc so the Patches / Tests /
Security / Releases pages have a real, durable data source.

This module only ever *records* what the agents already decided - it never
re-derives or overrides a release-blocking decision, never executes any
generated code or patch, and never performs any git/GitHub write operation.
"""

from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.analysis_run import AnalysisRun
from app.models.patch import Patch
from app.models.regression_test import RegressionTest
from app.models.security_finding import SecurityFinding
from app.models.release_readiness import ReleaseReadiness
from app.models.validation_run import ValidationRun
from app.agents.types import AgentResult, EngineResult

_BLOCKING_SEVERITIES = {"high", "critical"}


def _get_result(results: List[AgentResult], name: str) -> Optional[AgentResult]:
    return next((r for r in results if r.agent_name == name), None)


def persist_engine_result(
    db: Session,
    repository_id: int,
    issue_id: Optional[int],
    engine_result: EngineResult,
) -> AnalysisRun:
    """Persist one full pipeline run and its per-agent artifacts; returns the AnalysisRun row."""
    any_failed = any(r.status != "success" for r in engine_result.results)

    run = AnalysisRun(
        repository_id=repository_id,
        issue_id=issue_id,
        status="partial_failure" if any_failed else "completed",
        roadmap=engine_result.roadmap,
    )
    db.add(run)
    db.flush()  # assign run.id without committing yet

    patch_result = _get_result(engine_result.results, "patch_synthesis")
    if patch_result is not None and patch_result.status == "success":
        _persist_patch(db, run, repository_id, issue_id, patch_result)

    regression_result = _get_result(engine_result.results, "regression_test_synthesis")
    if regression_result is not None and regression_result.status == "success":
        _persist_regression_test(db, run, repository_id, issue_id, regression_result, engine_result.validation)

    security_result = _get_result(engine_result.results, "security_audit")
    if security_result is not None and security_result.status == "success":
        _persist_security_findings(db, run, repository_id, issue_id, security_result)

    # Phase 7: persist validation run if available
    val_run = None
    if getattr(engine_result, "validation", None):
        val_run = _persist_validation_run(db, run, repository_id, issue_id, engine_result.validation)

    release_result = _get_result(engine_result.results, "release")
    if release_result is not None and release_result.status == "success":
        _persist_release_readiness(db, run, repository_id, issue_id, release_result)

    db.commit()
    db.refresh(run)
    if val_run:
        db.refresh(val_run)
        engine_result.validation["id"] = val_run.id
        engine_result.validation["analysis_run_id"] = run.id
        engine_result.validation["repository_id"] = repository_id
        engine_result.validation["issue_id"] = issue_id
    return run


def _persist_patch(
    db: Session, run: AnalysisRun, repository_id: int, issue_id: Optional[int], result: AgentResult
) -> None:
    data = result.data
    unified_diff = data.get("diff")
    status = "Generated" if unified_diff else "Needs Review"

    db.add(
        Patch(
            analysis_run_id=run.id,
            repository_id=repository_id,
            issue_id=issue_id,
            mode=result.mode,
            status=status,
            review_status="Pending Review",
            summary=data.get("summary") or result.summary,
            files_changed=data.get("files_changed") or data.get("suspect_files") or [],
            unified_diff=unified_diff,
            reasoning=data.get("reasoning"),
            risks=data.get("risks") or [],
        )
    )


def _persist_regression_test(
    db: Session,
    run: AnalysisRun,
    repository_id: int,
    issue_id: Optional[int],
    result: AgentResult,
    validation_data: Optional[Dict[str, Any]] = None,
) -> None:
    data = result.data
    test_code = data.get("test_code")

    exec_status = "Generated — Not Executed"
    if not test_code:
        exec_status = "Not Generated"
    elif validation_data:
        val_status = validation_data.get("status")
        if val_status == "passed":
            exec_status = "Executed — Passed"
        elif val_status == "failed":
            exec_status = "Executed — Failed"
        elif val_status == "timeout":
            exec_status = "Execution Timeout"
        elif val_status in ("validation_unavailable", "setup_failed"):
            exec_status = "Validation Unavailable"

    db.add(
        RegressionTest(
            analysis_run_id=run.id,
            repository_id=repository_id,
            issue_id=issue_id,
            mode=result.mode,
            status="Generated" if test_code else "Not Generated",
            execution_status=exec_status,
            review_status="Pending Review",
            test_file=data.get("test_file"),
            purpose=data.get("purpose") or result.summary,
            reproduction_scenario=data.get("reproduction_scenario"),
            expected_behavior=data.get("expected_behavior"),
            test_code=test_code,
        )
    )


def _persist_validation_run(
    db: Session,
    run: AnalysisRun,
    repository_id: int,
    issue_id: Optional[int],
    val_data: Dict[str, Any],
) -> ValidationRun:
    val_run = ValidationRun(
        analysis_run_id=run.id,
        repository_id=repository_id,
        issue_id=issue_id,
        status=val_data.get("status", "validation_unavailable"),
        tests_run=bool(val_data.get("tests_run", False)),
        exit_code=val_data.get("exit_code"),
        stdout=val_data.get("stdout") or "",
        stderr=val_data.get("stderr") or "",
        duration_ms=int(val_data.get("duration_ms") or 0),
        summary=val_data.get("summary"),
        failure_reason=val_data.get("failure_reason"),
        executed_command=val_data.get("executed_command"),
    )
    db.add(val_run)
    return val_run


def _persist_security_findings(
    db: Session, run: AnalysisRun, repository_id: int, issue_id: Optional[int], result: AgentResult
) -> None:
    for finding in result.findings:
        db.add(
            SecurityFinding(
                analysis_run_id=run.id,
                repository_id=repository_id,
                issue_id=issue_id,
                mode=result.mode,
                severity=finding.severity,
                title=finding.title,
                detail=finding.detail,
                affected_area=finding.file_path,
                blocking=finding.severity.lower() in _BLOCKING_SEVERITIES,
            )
        )


def _persist_release_readiness(
    db: Session, run: AnalysisRun, repository_id: int, issue_id: Optional[int], result: AgentResult
) -> None:
    data = result.data
    gate_checks = [
        {
            "title": f.title,
            "detail": f.detail,
            "severity": f.severity,
            "category": f.category,
        }
        for f in result.findings
    ]

    db.add(
        ReleaseReadiness(
            analysis_run_id=run.id,
            repository_id=repository_id,
            issue_id=issue_id,
            mode=result.mode,
            release_ready=bool(data.get("release_ready", False)),
            status=data.get("status", "blocked"),
            blocking_reasons=data.get("blocking_reasons") or [],
            warnings=data.get("warnings") or [],
            gate_checks=gate_checks,
            human_approval_required=True,
        )
    )
