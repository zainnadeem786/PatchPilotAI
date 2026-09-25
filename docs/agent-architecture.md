# Phase 4 — Agent Architecture

This document lists the agents actually implemented in `backend/app/agents/`,
correcting an earlier PR description and docs draft that listed 7 agents
under different names before implementation began. See
`docs/phase4-overview.md` for how that original list maps onto what was
actually built.

## Implemented Agents (5)

All five agents implement the shared `BaseAgent` contract (`app/agents/base.py`)
and run in this fixed order via `AgentPipeline` (`app/agents/pipeline.py`),
each agent's result folded into `AgentContext.previous_results` for the next
agent to build on.

| # | Agent | File | Responsibility |
|---|-------|------|-----------------|
| 1 | `OrchestratorAgent` | `orchestrator_agent.py` | Triages the issue (category + priority) and plans which downstream stages are relevant. |
| 2 | `RepositoryIntelligenceAgent` | `repository_intelligence_agent.py` | Localizes suspect files via keyword matching (static) or LLM reasoning over the repository file listing and issue text. |
| 3 | `PatchSynthesisAgent` | `patch_synthesis_agent.py` | Produces a remediation outline (static) or a proposed unified diff (LLM). |
| 4 | `RegressionTestSynthesisAgent` | `regression_test_agent.py` | Drafts a test skeleton (static) or a full reproduction test (LLM). |
| 5 | `SecurityAuditAgent` | `security_audit_agent.py` | Screens the issue and proposed patch against CWE/OWASP-style regex rules (static) or an LLM-based review (LLM). |

Each agent works in two modes, both using the shared `LLMClient`
(`app/agents/llm_client.py`) injected via `AgentEngineService`:

- **static** (default, no API key required): deterministic rule-based analysis only.
- **llm**: calls any OpenAI-compatible chat completions endpoint (`AI_MODE=llm`,
  configured via `AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY`), including
  self-hosted vLLM deployments such as AMD Developer Cloud / ROCm.

A failing agent is caught by `BaseAgent.safe_run` and converted into an error
`AgentResult` rather than aborting the pipeline (see `AgentPipeline.run`).

## Roadmap consolidation

There is no separate "executive summary" agent. `AgentPipeline._build_roadmap`
consolidates every agent's findings into a severity-ranked `roadmap` list as
part of the `EngineResult` returned to the API - this responsibility lives in
the pipeline runner, not in a sixth agent.

## Entry point

`POST /api/v1/issues/{issue_id}/analyze` (added in `app/api/v1/endpoints/issues.py`)
builds an `AgentContext` from the persisted `Repository`/`Issue` rows via
`AgentEngineService` and runs the full pipeline.
