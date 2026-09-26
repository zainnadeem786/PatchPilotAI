"""Phase 6 tests: structured LLM output parsing for Patch Synthesis / Regression Test Synthesis,
and verification that the Security Audit Agent's deterministic scan is never overridden by the LLM."""

import json
import httpx
import pytest
from app.agents.llm_client import LLMClient
from app.agents.patch_synthesis_agent import PatchSynthesisAgent
from app.agents.regression_test_agent import RegressionTestSynthesisAgent
from app.agents.security_audit_agent import SecurityAuditAgent
from app.agents.types import AgentContext, AgentResult, IssueContext, RepositoryContext


def _llm_client() -> LLMClient:
    return LLMClient(mode="llm", base_url="http://localhost:8000/v1", model="test-model")


def _make_context(title="Bug", body="Something broke.") -> AgentContext:
    repository = RepositoryContext(
        id=1, owner="acme", name="widget", full_name="acme/widget",
        default_branch="main", language="Python", html_url="https://github.com/acme/widget",
    )
    issue = IssueContext(
        id=10, number=42, title=title, body=body, state="open",
        author="octocat", html_url="https://github.com/acme/widget/issues/42",
    )
    return AgentContext(repository=repository, issue=issue)


async def _mock_completion(monkeypatch, content: str):
    async def mock_post(self, url, json=None, headers=None, **kwargs):
        payload = {"choices": [{"message": {"content": content}}]}
        return httpx.Response(200, json=payload, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)


# ── Patch Synthesis: structured JSON ──────────────────────────────────────────


@pytest.mark.anyio
async def test_patch_synthesis_parses_structured_json(monkeypatch):
    structured = {
        "summary": "Guard against expired coupons.",
        "files_changed": ["app/services/checkout.py"],
        "unified_diff": "--- a/f\n+++ b/f\n@@ -1 +1 @@\n-old\n+new\n",
        "reasoning": "The exception was unhandled.",
        "risks": ["Could hide other coupon errors."],
    }
    await _mock_completion(monkeypatch, json.dumps(structured))

    agent = PatchSynthesisAgent(_llm_client())
    result = await agent.run(_make_context())

    assert result.status == "success"
    assert result.mode == "llm"
    assert result.data["diff"] == structured["unified_diff"]
    assert result.data["summary"] == structured["summary"]
    assert result.data["files_changed"] == structured["files_changed"]
    assert result.data["risks"] == structured["risks"]
    assert result.data["parse_error"] is False


@pytest.mark.anyio
async def test_patch_synthesis_handles_malformed_json_without_crashing(monkeypatch):
    await _mock_completion(monkeypatch, "This is not JSON at all, just prose.")

    agent = PatchSynthesisAgent(_llm_client())
    result = await agent.run(_make_context())

    assert result.status == "success"  # never raises/crashes the pipeline
    assert result.data["diff"] is None
    assert result.data["parse_error"] is True
    assert any("invalid structured response" in f.title.lower() for f in result.findings)


@pytest.mark.anyio
async def test_patch_synthesis_parses_json_wrapped_in_markdown_fence(monkeypatch):
    structured = {"summary": "Fix", "files_changed": [], "unified_diff": "", "reasoning": "x", "risks": []}
    await _mock_completion(monkeypatch, f"```json\n{json.dumps(structured)}\n```")

    agent = PatchSynthesisAgent(_llm_client())
    result = await agent.run(_make_context())

    assert result.data["parse_error"] is False
    assert result.data["summary"] == "Fix"


# ── Regression Test Synthesis: structured JSON ────────────────────────────────


@pytest.mark.anyio
async def test_regression_test_parses_structured_json_and_marks_not_executed(monkeypatch):
    structured = {
        "test_file": "tests/test_checkout.py",
        "purpose": "Verify expired coupons don't crash checkout.",
        "reproduction_scenario": "Apply an expired coupon code at checkout.",
        "expected_behavior": "Checkout succeeds with a warning instead of a 500.",
        "test_code": "def test_expired_coupon(): ...",
    }
    await _mock_completion(monkeypatch, json.dumps(structured))

    agent = RegressionTestSynthesisAgent(_llm_client())
    result = await agent.run(_make_context())

    assert result.status == "success"
    assert result.data["test_code"] == structured["test_code"]
    assert result.data["test_file"] == structured["test_file"]
    assert result.data["execution_status"] == "generated_not_executed"
    assert "not executed" in result.findings[0].title.lower() or "generated" in result.findings[0].title.lower()


@pytest.mark.anyio
async def test_regression_test_never_claims_execution_on_malformed_response(monkeypatch):
    await _mock_completion(monkeypatch, "not valid json")

    agent = RegressionTestSynthesisAgent(_llm_client())
    result = await agent.run(_make_context())

    assert result.status == "success"
    assert result.data["test_code"] is None
    assert result.data["execution_status"] == "not_generated"


# ── Security Audit: LLM narrative cannot override the deterministic scan ─────


@pytest.mark.anyio
async def test_security_audit_llm_mode_uses_deterministic_severity_not_llm_text(monkeypatch):
    """Even if the LLM narrative claims everything is fine, a hardcoded secret in the issue body
    must still be flagged 'critical' by the deterministic regex screen."""
    await _mock_completion(monkeypatch, "Looks totally safe, no issues found here!")

    agent = SecurityAuditAgent(_llm_client())
    context = _make_context(
        title="Config cleanup",
        body="api_key = 'sk-1234567890abcdef' was left in by mistake.",
    )
    result = await agent.run(context)

    assert result.mode == "llm"
    assert result.data["highest_severity"] == "critical"
    # The reassuring LLM text is preserved only as a supplementary, non-authoritative finding.
    assert any("supplementary" in f.title.lower() for f in result.findings)


@pytest.mark.anyio
async def test_security_audit_llm_mode_clean_when_static_scan_is_clean(monkeypatch):
    await _mock_completion(monkeypatch, "No issues found.")

    agent = SecurityAuditAgent(_llm_client())
    context = _make_context(title="Improve spacing", body="Looks off on mobile.")
    result = await agent.run(context)

    assert result.data["highest_severity"] == "info"
