"""AI Agent Engine package (Phase 4 + Phase 5).

Exposes the shared agent contracts (`BaseAgent`, `AgentContext`, `AgentResult`),
the `LLMClient` abstraction, the six pipeline agents, and the `AgentPipeline`
runner that executes them in order.

Canonical six-agent pipeline (in execution order):
  1. OrchestratorAgent
  2. RepositoryIntelligenceAgent
  3. PatchSynthesisAgent
  4. RegressionTestSynthesisAgent
  5. SecurityAuditAgent
  6. ReleaseAgent
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
from app.agents.release_agent import ReleaseAgent

# Ordered list used as the canonical agent registry by the pipeline service
# and the /api/v1/agents metadata endpoint.
AGENT_REGISTRY = [
    {
        "name": "orchestrator",
        "display_name": "Orchestrator Agent",
        "role": "Issue Triage & Pipeline Planning",
        "description": (
            "Classifies the issue category and priority using keyword heuristics "
            "(static mode) or LLM reasoning (llm mode) and plans which downstream "
            "pipeline stages are relevant."
        ),
    },
    {
        "name": "repository_intelligence",
        "display_name": "Repository Intelligence Agent",
        "role": "Relevant-File Identification",
        "description": (
            "Identifies repository files likely related to the issue using "
            "keyword matching against the top-level file tree (static mode) or "
            "LLM-assisted root-cause hypothesis (llm mode). "
            "Does not perform full AST or symbol-graph analysis."
        ),
    },
    {
        "name": "patch_synthesis",
        "display_name": "Patch Synthesis Agent",
        "role": "Remediation & Patch Generation",
        "description": (
            "Produces a manual remediation outline referencing suspect files "
            "(static mode) or a proposed unified diff (llm mode). "
            "No code is automatically committed or pushed."
        ),
    },
    {
        "name": "regression_test_synthesis",
        "display_name": "Regression Test Synthesis Agent",
        "role": "Regression Test Generation",
        "description": (
            "Generates a language-appropriate regression test skeleton (static mode) "
            "or a full reproduction test (llm mode). "
            "Generated tests are not automatically executed."
        ),
    },
    {
        "name": "security_audit",
        "display_name": "Security Audit Agent",
        "role": "Security & CWE/OWASP Pattern Screening",
        "description": (
            "Screens the issue text and proposed patch for known-risky patterns "
            "using static CWE/OWASP-aligned regex rules (static mode) or "
            "LLM-assisted security reasoning (llm mode)."
        ),
    },
    {
        "name": "release",
        "display_name": "Release Agent",
        "role": "Release Readiness Evaluation",
        "description": (
            "Evaluates whether the pipeline output is ready for human release "
            "approval by checking patch readiness, regression test coverage, "
            "security findings, and upstream agent health. "
            "Never commits, pushes, merges, or deploys automatically."
        ),
    },
]

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
    "ReleaseAgent",
    "AGENT_REGISTRY",
]
