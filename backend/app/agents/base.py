"""Abstract base class every AI Agent Engine agent must implement."""

import logging
from abc import ABC, abstractmethod
from app.agents.types import AgentContext, AgentResult
from app.agents.llm_client import LLMClient, LLMClientError

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """Base contract for a single pipeline stage.

    Concrete agents encapsulate one stage of the `Triage -> Root Cause
    Analysis -> Patch Generation -> Test Synthesis -> Static Audit ->
    Verification` workflow described in `docs/ARCHITECTURE.md`. Each agent
    must work in both "static" mode (deterministic pattern matching, no
    external calls) and "llm" mode (via the injected `LLMClient`), and must
    never instantiate its own HTTP client or query the database directly -
    all required data arrives through `AgentContext`.
    """

    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique, stable agent identifier used as a key in `previous_results`."""
        raise NotImplementedError

    @abstractmethod
    async def run(self, context: AgentContext) -> AgentResult:
        """Execute this agent's analysis stage and return a typed result.

        Implementations should only raise for genuinely unexpected failures;
        `safe_run` (called by `AgentPipeline`) converts any exception into an
        error `AgentResult` so one failing agent cannot crash the pipeline.
        """
        raise NotImplementedError

    async def safe_run(self, context: AgentContext) -> AgentResult:
        """Run this agent, converting any unhandled exception into an error result."""
        try:
            return await self.run(context)
        except LLMClientError as exc:
            logger.warning("%s failed to reach the LLM endpoint: %s", self.name, exc)
            return AgentResult(
                agent_name=self.name,
                status="error",
                mode="llm",
                summary=f"{self.name} failed to reach the configured LLM endpoint.",
                error=str(exc),
            )
        except Exception as exc:
            logger.exception("%s raised an unexpected error during pipeline execution.", self.name)
            return AgentResult(
                agent_name=self.name,
                status="error",
                mode=self.llm_client.mode,
                summary=f"{self.name} raised an unexpected error.",
                error=str(exc),
            )
