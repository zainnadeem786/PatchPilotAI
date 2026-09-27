"""Sequential pipeline runner executing all AI Agent Engine agents in order."""

import logging
from typing import Any, List
from app.agents.base import BaseAgent
from app.agents.types import AgentContext, AgentResult, EngineResult

logger = logging.getLogger(__name__)

_SEVERITY_RANK = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}


class AgentPipeline:
    """Runs a fixed, ordered sequence of agents against a shared `AgentContext`.

    Mirrors the workflow in `docs/ARCHITECTURE.md` section 5: Triage -> Root
    Cause Analysis -> Patch Generation -> Test Synthesis -> Static Audit ->
    Verification. Each agent's result is folded into `context.previous_results`
    before the next agent runs, so later agents can build on earlier findings.
    A failing agent is logged and converted into an error result rather than
    aborting the run - subsequent agents still execute.
    """

    def __init__(self, agents: List[BaseAgent]):
        self.agents = agents

    async def run(self, context: AgentContext, validator: Any = None) -> EngineResult:
        """Execute every agent in order and return the aggregated `EngineResult`."""
        for agent in self.agents:
            if agent.name == "release" and validator is not None and context.validation_result is None:
                val = validator(context)
                if hasattr(val, "__await__"):
                    val = await val
                context.validation_result = val

            result = await agent.safe_run(context)
            if result.status == "error":
                logger.warning("Agent '%s' failed: %s", agent.name, result.error)
            context.previous_results[agent.name] = result

        results = list(context.previous_results.values())
        roadmap = self._build_roadmap(results)

        val_dict = None
        if context.validation_result is not None:
            if hasattr(context.validation_result, "to_dict"):
                val_dict = context.validation_result.to_dict()
            elif isinstance(context.validation_result, dict):
                val_dict = context.validation_result

        return EngineResult(
            repository_id=context.repository.id,
            issue_id=context.issue.id if context.issue else None,
            results=results,
            roadmap=roadmap,
            validation=val_dict,
        )

    @staticmethod
    def _build_roadmap(results: List[AgentResult]) -> List[str]:
        """Derive an ordered, human-readable fix roadmap from successful agent findings."""
        ranked_findings = sorted(
            (
                finding
                for result in results
                if result.status == "success"
                for finding in result.findings
                if finding.severity != "info"
            ),
            key=lambda finding: _SEVERITY_RANK.get(finding.severity, len(_SEVERITY_RANK)),
        )
        return [f"[{finding.severity.upper()}] {finding.title}" for finding in ranked_findings]
