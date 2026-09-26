"""Comprehensive tests for the ReleaseAgent in static mode and edge cases."""

import pytest
from app.agents.llm_client import LLMClient, LLMClientError
from app.agents.release_agent import ReleaseAgent
from app.agents.types import (
    AgentContext,
    AgentFinding,
    AgentResult,
    IssueContext,
    RepositoryContext,
)


# ── Helpers ────────────────────────────────────────────────────────────────────


def _static_client() -> LLMClient:
    return LLMClient(mode="static")


def _make_context(
    title: str = "Test issue",
    body: str = "Some body",
    language: str = "Python",
) -> AgentContext:
    repository = RepositoryContext(
        id=1,
        owner="acme",
        name="widget",
        full_name="acme/widget",
        default_branch="main",
        language=language,
        html_url="https://github.com/acme/widget",
    )
    issue = IssueContext(
        id=10,
        number=42,
        title=title,
        body=body,
        state="open",
        author="octocat",
        html_url="https://github.com/acme/widget/issues/42",
    )
    return AgentContext(repository=repository, issue=issue)


def _success_result(agent_name: str, summary: str = "ok", data: dict | None = None) -> AgentResult:
    return AgentResult(
        agent_name=agent_name,
        status="success",
        mode="static",
        summary=summary,
        data=data or {},
    )


def _error_result(agent_name: str, error: str = "something went wrong") -> AgentResult:
    return AgentResult(
        agent_name=agent_name,
        status="error",
        mode="static",
        summary="failed",
        error=error,
    )


def _full_success_previous_results(
    include_diff: bool = False,
    include_test_code: bool = True,
    highest_severity: str = "info",
) -> dict:
    return {
        "orchestrator": _success_result(
            "orchestrator",
            summary="Triaged as bug/medium.",
            data={"category": "bug", "priority": "medium", "planned_stages": []},
        ),
        "repository_intelligence": _success_result(
            "repository_intelligence",
            summary="Matched 1 candidate file.",
            data={"suspect_files": ["core/handler.py"]},
        ),
        "patch_synthesis": _success_result(
            "patch_synthesis",
            summary="Patch produced.",
            data={"diff": "--- a/f\n+++ b/f\n@@ -1 +1 @@\n-old\n+new\n" if include_diff else None,
                  "suspect_files": ["core/handler.py"]},
        ),
        "regression_test_synthesis": _success_result(
            "regression_test_synthesis",
            summary="Test skeleton generated.",
            data={"test_code": "def test_issue_42_regression(): raise NotImplementedError" if include_test_code else None},
        ),
        "security_audit": _success_result(
            "security_audit",
            summary="No risk found.",
            data={"highest_severity": highest_severity},
            # also attach an info finding to reflect real agent output
        ),
    }


# ── Test: Ready scenario (all agents succeed, no blocking security) ────────────


@pytest.mark.anyio
async def test_release_agent_ready_when_all_agents_succeed():
    """All required stages complete and no blocking security findings → release_ready = True."""
    agent = ReleaseAgent(_static_client())
    context = _make_context()
    context.previous_results = _full_success_previous_results()

    result = await agent.run(context)

    assert result.status == "success"
    assert result.mode == "static"
    assert result.data["release_ready"] is True
    assert result.data["status"] == "human_review_required"
    assert result.data["blocking_reasons"] == []
    assert len(result.data["warnings"]) > 0  # static mode warning always present


# ── Test: Patch missing (diff=None, no test code either) ──────────────────────


@pytest.mark.anyio
async def test_release_agent_warns_when_patch_outline_only():
    """No diff produced in static mode → warning added, not a blocker."""
    agent = ReleaseAgent(_static_client())
    context = _make_context()
    context.previous_results = _full_success_previous_results(include_diff=False)

    result = await agent.run(context)

    assert result.status == "success"
    assert result.data["release_ready"] is True  # outline is not a blocker
    warnings = result.data["warnings"]
    assert any("remediation outline" in w.lower() or "static mode" in w.lower() for w in warnings)


# ── Test: Regression evidence missing (test_code=None) ────────────────────────


@pytest.mark.anyio
async def test_release_agent_warns_when_no_test_code():
    """Regression test not generated → warning, not a blocker."""
    agent = ReleaseAgent(_static_client())
    context = _make_context()
    context.previous_results = _full_success_previous_results(include_test_code=False)

    result = await agent.run(context)

    assert result.status == "success"
    assert result.data["release_ready"] is True
    warnings = result.data["warnings"]
    assert any("regression test" in w.lower() for w in warnings)


@pytest.mark.anyio
async def test_release_agent_warns_when_test_generated_but_not_executed():
    """Test skeleton generated but not run → warning that it has not been executed."""
    agent = ReleaseAgent(_static_client())
    context = _make_context()
    context.previous_results = _full_success_previous_results(include_test_code=True)

    result = await agent.run(context)

    warnings = result.data["warnings"]
    assert any("not been executed" in w.lower() or "not executed" in w.lower() for w in warnings)


# ── Test: High/critical security finding blocks release ───────────────────────


@pytest.mark.anyio
async def test_release_agent_blocked_by_high_security_finding():
    """High-severity security finding → blocked."""
    agent = ReleaseAgent(_static_client())
    context = _make_context()
    context.previous_results = _full_success_previous_results(highest_severity="high")

    result = await agent.run(context)

    assert result.data["release_ready"] is False
    assert result.data["status"] == "blocked"
    blocking = result.data["blocking_reasons"]
    assert any("high" in r.lower() for r in blocking)


@pytest.mark.anyio
async def test_release_agent_blocked_by_critical_security_finding():
    """Critical-severity security finding → blocked."""
    agent = ReleaseAgent(_static_client())
    context = _make_context()
    context.previous_results = _full_success_previous_results(highest_severity="critical")

    result = await agent.run(context)

    assert result.data["release_ready"] is False
    blocking = result.data["blocking_reasons"]
    assert any("critical" in r.lower() for r in blocking)


@pytest.mark.anyio
async def test_release_agent_warns_on_medium_security_finding():
    """Medium-severity security finding → warning only, not a blocker."""
    agent = ReleaseAgent(_static_client())
    context = _make_context()
    context.previous_results = _full_success_previous_results(highest_severity="medium")

    result = await agent.run(context)

    assert result.data["release_ready"] is True
    assert result.data["status"] == "human_review_required"
    warnings = result.data["warnings"]
    assert any("medium" in w.lower() for w in warnings)


# ── Test: Upstream agent failure blocks release ────────────────────────────────


@pytest.mark.anyio
async def test_release_agent_blocked_when_security_audit_failed():
    """Failed security audit → blocked with clear reason."""
    agent = ReleaseAgent(_static_client())
    context = _make_context()
    context.previous_results = _full_success_previous_results()
    context.previous_results["security_audit"] = _error_result(
        "security_audit", error="Timeout connecting to LLM"
    )

    result = await agent.run(context)

    assert result.data["release_ready"] is False
    assert result.data["status"] == "blocked"
    blocking = result.data["blocking_reasons"]
    assert any("security_audit" in r for r in blocking)
    assert any("Timeout" in r for r in blocking)


@pytest.mark.anyio
async def test_release_agent_blocked_when_patch_agent_failed():
    """Failed patch synthesis → blocked with clear reason."""
    agent = ReleaseAgent(_static_client())
    context = _make_context()
    context.previous_results = _full_success_previous_results()
    context.previous_results["patch_synthesis"] = _error_result(
        "patch_synthesis", error="LLM provider unavailable"
    )

    result = await agent.run(context)

    assert result.data["release_ready"] is False
    blocking = result.data["blocking_reasons"]
    assert any("patch_synthesis" in r for r in blocking)


# ── Test: Static mode ─────────────────────────────────────────────────────────


@pytest.mark.anyio
async def test_release_agent_works_in_static_mode_without_llm():
    """ReleaseAgent must execute and return a useful result without any LLM call."""
    agent = ReleaseAgent(_static_client())
    context = _make_context()
    context.previous_results = _full_success_previous_results()

    result = await agent.run(context)

    assert result.status == "success"
    assert result.mode == "static"
    warnings = result.data["warnings"]
    assert any("static" in w.lower() for w in warnings)


@pytest.mark.anyio
async def test_release_agent_static_mode_never_fabricates_test_execution():
    """Static mode must not claim tests passed — test was generated, not executed."""
    agent = ReleaseAgent(_static_client())
    context = _make_context()
    context.previous_results = _full_success_previous_results(include_test_code=True)

    result = await agent.run(context)

    # The check finding for the test should explicitly say "not executed"
    test_findings = [f for f in result.findings if f.category == "test"]
    assert len(test_findings) >= 1
    assert all("not executed" in f.title.lower() or "not executed" in f.detail.lower()
               for f in test_findings)


# ── Test: LLM provider failure ────────────────────────────────────────────────


@pytest.mark.anyio
async def test_release_agent_handles_llm_provider_failure_via_safe_run():
    """If the LLM fails, safe_run converts the exception into an error result — no crash."""
    from unittest.mock import AsyncMock, patch

    agent = ReleaseAgent(LLMClient(mode="llm", base_url="http://fake-llm", api_key="x"))
    context = _make_context()
    context.previous_results = _full_success_previous_results()

    with patch.object(agent.llm_client, "complete", new_callable=AsyncMock) as mock_complete:
        mock_complete.side_effect = LLMClientError("Provider unreachable")
        result = await agent.safe_run(context)

    assert result.status == "error"
    assert result.error is not None
    assert "Provider unreachable" in result.error


# ── Test: Malformed upstream output ───────────────────────────────────────────


@pytest.mark.anyio
async def test_release_agent_handles_missing_data_key_gracefully():
    """Even if an upstream agent's data dict is missing expected keys, no crash occurs."""
    agent = ReleaseAgent(_static_client())
    context = _make_context()
    # Provide results with empty data dicts (no diff, no test_code, no highest_severity)
    context.previous_results = {
        "orchestrator": AgentResult(
            agent_name="orchestrator", status="success", mode="static",
            summary="ok", data={}  # missing category/priority
        ),
        "repository_intelligence": AgentResult(
            agent_name="repository_intelligence", status="success", mode="static",
            summary="ok", data={}  # missing suspect_files
        ),
        "patch_synthesis": AgentResult(
            agent_name="patch_synthesis", status="success", mode="static",
            summary="ok", data={}  # missing diff, suspect_files
        ),
        "regression_test_synthesis": AgentResult(
            agent_name="regression_test_synthesis", status="success", mode="static",
            summary="ok", data={}  # missing test_code
        ),
        "security_audit": AgentResult(
            agent_name="security_audit", status="success", mode="static",
            summary="ok", data={}  # missing highest_severity
        ),
    }

    result = await agent.run(context)

    # Must not raise; must produce a usable result
    assert result.status == "success"
    assert "release_ready" in result.data
    assert "blocking_reasons" in result.data
    assert "warnings" in result.data


# ── Test: Partial pipeline failure ────────────────────────────────────────────


@pytest.mark.anyio
async def test_release_agent_partial_failure_is_useful_and_explicit():
    """Two agents fail → still produces a result; blocking reasons are explicit."""
    agent = ReleaseAgent(_static_client())
    context = _make_context()
    context.previous_results = {
        "orchestrator": _success_result("orchestrator", data={"category": "bug", "priority": "medium"}),
        "repository_intelligence": _success_result("repository_intelligence", data={"suspect_files": []}),
        "patch_synthesis": _error_result("patch_synthesis", error="LLM timeout"),
        "regression_test_synthesis": _error_result("regression_test_synthesis", error="model error"),
        "security_audit": _success_result("security_audit", data={"highest_severity": "info"}),
    }

    result = await agent.run(context)

    assert result.status == "success"  # ReleaseAgent itself succeeds
    assert result.data["release_ready"] is False
    blocking = result.data["blocking_reasons"]
    assert any("patch_synthesis" in r for r in blocking)
    assert any("regression_test_synthesis" in r for r in blocking)
    assert len(blocking) >= 2


# ── Test: No prior results at all (empty pipeline) ────────────────────────────


@pytest.mark.anyio
async def test_release_agent_handles_empty_previous_results():
    """If ReleaseAgent somehow runs with no prior results, it blocks and explains why."""
    agent = ReleaseAgent(_static_client())
    context = _make_context()
    # previous_results is empty dict (default)

    result = await agent.run(context)

    assert result.status == "success"
    assert result.data["release_ready"] is False
    blocking = result.data["blocking_reasons"]
    assert len(blocking) >= 5  # all five required agents reported as missing


# ── Test: Human approval always required ──────────────────────────────────────


@pytest.mark.anyio
async def test_release_agent_always_includes_human_approval_finding():
    """The human-approval finding must always be present regardless of readiness state."""
    agent = ReleaseAgent(_static_client())
    context = _make_context()
    context.previous_results = _full_success_previous_results()

    result = await agent.run(context)

    human_approval_findings = [
        f for f in result.findings
        if f.category == "release" and "human" in f.title.lower()
    ]
    assert len(human_approval_findings) >= 1


# ── Test: Full pipeline integration via endpoint ──────────────────────────────


def test_analyze_endpoint_returns_six_agents(client, monkeypatch):
    """Integration: POST /issues/{id}/analyze must now return exactly six agent results."""
    from app.services.github_service import github_service

    SAMPLE_REPO = {
        "id": 9999, "name": "widget", "full_name": "acme/widget",
        "owner": {"login": "acme"}, "description": "Test",
        "default_branch": "main", "private": False,
        "html_url": "https://github.com/acme/widget",
        "language": "Python", "open_issues_count": 1,
    }
    SAMPLE_ISSUES = [{
        "id": 101, "number": 1, "title": "Fix bug",
        "body": "Something broke.", "state": "open",
        "html_url": "https://github.com/acme/widget/issues/1",
        "user": {"login": "octocat"},
    }]

    async def mock_get_repo(owner, name, token=None):
        return SAMPLE_REPO

    async def mock_list_issues(owner, name, state="open", token=None):
        return SAMPLE_ISSUES

    async def mock_get_contents(owner, name, path="", token=None):
        return []

    monkeypatch.setattr(github_service, "get_repository", mock_get_repo)
    monkeypatch.setattr(github_service, "list_repository_issues", mock_list_issues)
    monkeypatch.setattr(github_service, "get_repository_contents", mock_get_contents)

    client.post("/api/v1/repositories", json={"owner": "acme", "name": "widget"})
    issue_id = client.get("/api/v1/issues").json()[0]["id"]

    response = client.post(f"/api/v1/issues/{issue_id}/analyze")
    assert response.status_code == 200

    data = response.json()
    agent_names = {r["agent_name"] for r in data["results"]}
    assert agent_names == {
        "orchestrator",
        "repository_intelligence",
        "patch_synthesis",
        "regression_test_synthesis",
        "security_audit",
        "release",
    }

    # ReleaseAgent result shape
    release_result = next(r for r in data["results"] if r["agent_name"] == "release")
    assert release_result["status"] == "success"
    assert "release_ready" in release_result["data"]
    assert "blocking_reasons" in release_result["data"]
    assert "warnings" in release_result["data"]
    assert "status" in release_result["data"]


# ── Test: GET /api/v1/agents returns canonical registry ──────────────────────


def test_agents_registry_endpoint_returns_six_agents(client):
    """GET /api/v1/agents must return exactly 6 agent entries in pipeline order."""
    response = client.get("/api/v1/agents")
    assert response.status_code == 200

    agents = response.json()
    assert len(agents) == 6

    names = [a["name"] for a in agents]
    assert names == [
        "orchestrator",
        "repository_intelligence",
        "patch_synthesis",
        "regression_test_synthesis",
        "security_audit",
        "release",
    ]

    for agent in agents:
        assert "name" in agent
        assert "display_name" in agent
        assert "role" in agent
        assert "description" in agent
        assert len(agent["description"]) > 0
