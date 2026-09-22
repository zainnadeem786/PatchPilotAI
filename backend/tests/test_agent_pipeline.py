"""Tests for AgentPipeline: happy path execution order and partial-failure resilience."""

import pytest
from app.agents.base import BaseAgent
from app.agents.llm_client import LLMClient
from app.agents.pipeline import AgentPipeline
from app.agents.types import AgentContext, AgentResult, IssueContext, RepositoryContext


def _make_context() -> AgentContext:
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
        title="Something broke",
        body="Details here.",
        state="open",
        author="octocat",
        html_url="https://github.com/acme/widget/issues/42",
    )
    return AgentContext(repository=repository, issue=issue)


class _RecordingAgent(BaseAgent):
    """Test double that records the order in which it ran and always succeeds."""

    def __init__(self, llm_client: LLMClient, agent_name: str, call_order: list):
        super().__init__(llm_client)
        self._name = agent_name
        self._call_order = call_order

    @property
    def name(self) -> str:
        return self._name

    async def run(self, context: AgentContext) -> AgentResult:
        self._call_order.append(self._name)
        return AgentResult(agent_name=self._name, status="success", mode="static", summary="ok")


class _FailingAgent(BaseAgent):
    """Test double that always raises to exercise pipeline failure resilience."""

    @property
    def name(self) -> str:
        return "failing_agent"

    async def run(self, context: AgentContext) -> AgentResult:
        raise RuntimeError("boom")


@pytest.mark.anyio
async def test_pipeline_runs_agents_in_order_and_accumulates_context():
    """Verify agents run sequentially and each sees prior results in `previous_results`."""
    call_order: list = []
    llm_client = LLMClient(mode="static")
    agents = [
        _RecordingAgent(llm_client, "first", call_order),
        _RecordingAgent(llm_client, "second", call_order),
        _RecordingAgent(llm_client, "third", call_order),
    ]
    pipeline = AgentPipeline(agents)
    context = _make_context()

    engine_result = await pipeline.run(context)

    assert call_order == ["first", "second", "third"]
    assert {r.agent_name for r in engine_result.results} == {"first", "second", "third"}
    assert engine_result.repository_id == 1
    assert engine_result.issue_id == 10
    assert all(r.status == "success" for r in engine_result.results)


@pytest.mark.anyio
async def test_pipeline_continues_after_one_agent_fails():
    """Verify a single agent's unhandled exception is converted to an error result without aborting the run."""
    call_order: list = []
    llm_client = LLMClient(mode="static")
    agents = [
        _RecordingAgent(llm_client, "before", call_order),
        _FailingAgent(llm_client),
        _RecordingAgent(llm_client, "after", call_order),
    ]
    pipeline = AgentPipeline(agents)
    context = _make_context()

    engine_result = await pipeline.run(context)

    # Both healthy agents still ran despite the middle agent failing.
    assert call_order == ["before", "after"]

    results_by_name = {r.agent_name: r for r in engine_result.results}
    assert results_by_name["before"].status == "success"
    assert results_by_name["after"].status == "success"
    assert results_by_name["failing_agent"].status == "error"
    assert "boom" in results_by_name["failing_agent"].error
