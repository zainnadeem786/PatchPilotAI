"""AI Agent Engine package (Phase 4).

Exposes the shared agent contracts (`BaseAgent`, `AgentContext`, `AgentResult`),
the `LLMClient` abstraction, the five pipeline agents, and the `AgentPipeline`
runner that executes them in order.
"""

from app.agents.types import (
    AgentContext,
    AgentFinding,
    AgentResult,
    EngineResult,
    IssueContext,
    RepositoryContext,
    RepositoryFileEntry,
)
from app.agents.base import BaseAgent
from app.agents.llm_client import LLMClient, LLMClientError, llm_client
from app.agents.pipeline import AgentPipeline
from app.agents.orchestrator_agent import OrchestratorAgent
from app.agents.repository_intelligence_agent import RepositoryIntelligenceAgent
from app.agents.patch_synthesis_agent import PatchSynthesisAgent
from app.agents.regression_test_agent import RegressionTestSynthesisAgent
from app.agents.security_audit_agent import SecurityAuditAgent

__all__ = [
    "AgentContext",
    "AgentFinding",
    "AgentResult",
    "EngineResult",
    "IssueContext",
    "RepositoryContext",
    "RepositoryFileEntry",
    "BaseAgent",
    "LLMClient",
    "LLMClientError",
    "llm_client",
    "AgentPipeline",
    "OrchestratorAgent",
    "RepositoryIntelligenceAgent",
    "PatchSynthesisAgent",
    "RegressionTestSynthesisAgent",
    "SecurityAuditAgent",
]
