"""Regression tests for SecurityAuditAgent's SQL injection detection heuristics (SEC-03)."""

import pytest
from app.agents.security_audit_agent import SecurityAuditAgent, _scan
from app.agents.llm_client import LLMClient
from app.agents.types import AgentContext, IssueContext, RepositoryContext


def _static_llm_client() -> LLMClient:
    """Return an LLMClient forced into static mode regardless of environment configuration."""
    return LLMClient(mode="static")


def _make_context(body: str) -> AgentContext:
    repository = RepositoryContext(
        id=1,
        owner="acme",
        name="widget",
        full_name="acme/widget",
        default_branch="main",
        language="Python",
        html_url="https://github.com/acme/widget",
    )
    issue = IssueContext(
        id=10,
        number=42,
        title="Suspicious code snippet",
        body=body,
        state="open",
        author="octocat",
        html_url="https://github.com/acme/widget/issues/42",
    )
    return AgentContext(repository=repository, issue=issue)


VULNERABLE_SNIPPETS = [
    '"SELECT * FROM " + table + " WHERE id=" + id',
    'query = "DELETE FROM sessions WHERE token=" + token',
    'String.format("SELECT * FROM %s WHERE id=%s", table, id)',
    '"SELECT * FROM {} WHERE id={}".format(table, id)',
    'query = f"SELECT * FROM {table} WHERE id={user_id}"',
    '"SELECT * FROM %s" % table',
    'sql += " AND name=" + name',
    'query += userInput',
]

SAFE_SNIPPETS = [
    'cursor.execute("SELECT * FROM users WHERE id=?", (user_id,))',
    'cursor.execute("SELECT * FROM users WHERE id=%s", [user_id])',
]


@pytest.mark.parametrize("snippet", VULNERABLE_SNIPPETS)
def test_scan_flags_sql_injection_pattern(snippet):
    """Verify each newly-covered SQL concatenation/formatting pattern is detected."""
    findings = _scan(snippet)
    assert any(f.category == "security" for f in findings), f"Expected a finding for: {snippet!r}"


@pytest.mark.parametrize("snippet", SAFE_SNIPPETS)
def test_scan_does_not_flag_parameterized_queries(snippet):
    """Verify safe parameterized queries (placeholders + separate params) are not flagged."""
    findings = _scan(snippet)
    assert findings == [], f"Did not expect a finding for safe query: {snippet!r}, got {findings}"


@pytest.mark.anyio
async def test_security_audit_agent_flags_fstring_sql_in_issue_body():
    """Verify the agent, end-to-end in static mode, flags an f-string SQL pattern pasted into an issue body."""
    agent = SecurityAuditAgent(_static_llm_client())
    context = _make_context(body='We fixed it locally with query = f"SELECT * FROM {table} WHERE id={user_id}"')

    result = await agent.run(context)

    assert result.status == "success"
    assert result.data["highest_severity"] == "high"


@pytest.mark.anyio
async def test_security_audit_agent_does_not_flag_parameterized_query_in_issue_body():
    """Verify the agent, end-to-end in static mode, does not flag a safe parameterized query example."""
    agent = SecurityAuditAgent(_static_llm_client())
    context = _make_context(
        body='For reference, the safe version is cursor.execute("SELECT * FROM users WHERE id=%s", [user_id])'
    )

    result = await agent.run(context)

    assert result.status == "success"
    assert result.data["highest_severity"] == "info"
