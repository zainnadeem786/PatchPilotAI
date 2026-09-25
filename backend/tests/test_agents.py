"""Tests for individual AI Agent Engine agents in deterministic static mode."""

import pytest
from app.agents.llm_client import LLMClient
from app.agents.types import AgentContext, IssueContext, RepositoryContext, RepositoryFileEntry
from app.agents.orchestrator_agent import OrchestratorAgent
from app.agents.repository_intelligence_agent import RepositoryIntelligenceAgent
from app.agents.patch_synthesis_agent import PatchSynthesisAgent
from app.agents.regression_test_agent import RegressionTestSynthesisAgent
from app.agents.security_audit_agent import SecurityAuditAgent


def _static_llm_client() -> LLMClient:
    """Return an LLMClient forced into static mode regardless of environment configuration."""
    return LLMClient(mode="static")


def _make_context(title: str, body: str, language: str = "Python", files=None) -> AgentContext:
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
    return AgentContext(
        repository=repository,
        issue=issue,
        repository_files=files or [],
    )


@pytest.mark.anyio
async def test_orchestrator_agent_classifies_security_issue():
    """Verify keyword triage classifies a security-flavored issue as high priority security."""
    agent = OrchestratorAgent(_static_llm_client())
    context = _make_context(
        title="SQL injection vulnerability in login form",
        body="An attacker can exploit this security vulnerability to bypass authentication.",
    )

    result = await agent.run(context)

    assert result.status == "success"
    assert result.mode == "static"
    assert result.data["category"] == "security"
    assert "security_audit" in result.data["planned_stages"]


@pytest.mark.anyio
async def test_orchestrator_agent_classifies_enhancement_by_default():
    """Verify an issue with no matching keywords falls back to the 'enhancement' category."""
    agent = OrchestratorAgent(_static_llm_client())
    context = _make_context(title="Add dark mode toggle", body="Please add a dark mode option.")

    result = await agent.run(context)

    assert result.data["category"] == "enhancement"
    assert result.data["priority"] == "medium"


@pytest.mark.anyio
async def test_repository_intelligence_agent_matches_keywords():
    """Verify keyword-based file matching surfaces a suspect file whose name matches the issue text."""
    agent = RepositoryIntelligenceAgent(_static_llm_client())
    files = [
        RepositoryFileEntry(path="auth_service.py", type="file"),
        RepositoryFileEntry(path="README.md", type="file"),
    ]
    context = _make_context(
        title="Authentication fails intermittently",
        body="The authentication flow raises an unexpected error.",
        files=files,
    )

    result = await agent.run(context)

    assert result.status == "success"
    assert "auth_service.py" in result.data["suspect_files"]
    assert "README.md" not in result.data["suspect_files"]


@pytest.mark.anyio
async def test_repository_intelligence_agent_handles_empty_file_list():
    """Verify the agent degrades gracefully when no repository file listing is available."""
    agent = RepositoryIntelligenceAgent(_static_llm_client())
    context = _make_context(title="Crash on startup", body="App crashes immediately.", files=[])

    result = await agent.run(context)

    assert result.status == "success"
    assert result.data["suspect_files"] == []


@pytest.mark.anyio
async def test_patch_synthesis_agent_static_mode_uses_suspect_files():
    """Verify static mode references suspect files identified by the previous agent, without generating a diff."""
    agent = PatchSynthesisAgent(_static_llm_client())
    context = _make_context(title="Bug", body="Something is broken.")
    context.previous_results["repository_intelligence"] = type(
        "Result", (), {"data": {"suspect_files": ["core/handler.py"]}}
    )()

    result = await agent.run(context)

    assert result.status == "success"
    assert result.data["diff"] is None
    assert "core/handler.py" in result.findings[0].detail


@pytest.mark.anyio
async def test_regression_test_agent_static_mode_generates_python_skeleton():
    """Verify a pytest-style skeleton is generated for a Python repository."""
    agent = RegressionTestSynthesisAgent(_static_llm_client())
    context = _make_context(title="Off-by-one error in pagination", body="Pagination skips the last item.")

    result = await agent.run(context)

    assert result.status == "success"
    assert "def test_issue_42_regression" in result.data["test_code"]


@pytest.mark.anyio
async def test_security_audit_agent_detects_hardcoded_secret():
    """Verify the static regex screen flags a hardcoded credential-like literal."""
    agent = SecurityAuditAgent(_static_llm_client())
    context = _make_context(
        title="Config cleanup",
        body="api_key = 'sk-1234567890abcdef' was left in the config by mistake.",
    )

    result = await agent.run(context)

    assert result.status == "success"
    assert result.data["highest_severity"] == "critical"
    assert any(f.category == "security" for f in result.findings)


@pytest.mark.anyio
async def test_security_audit_agent_reports_clean_when_no_patterns_match():
    """Verify a benign issue produces an informational 'no risk detected' finding."""
    agent = SecurityAuditAgent(_static_llm_client())
    context = _make_context(title="Improve button spacing", body="The spacing looks off on mobile.")

    result = await agent.run(context)

    assert result.status == "success"
    assert result.data["highest_severity"] == "info"
