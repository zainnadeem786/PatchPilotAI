# Agents Layer (AI Agent Engine — Phase 4)

## Purpose
This directory implements PatchPilot's multi-agent AI engine, wired to the
Phase 3 repository/issue data model via `app/services/agent_engine_service.py`
and exposed through `POST /api/v1/issues/{issue_id}/analyze`.

## Agent Pipeline
Agents run in this order, each folding its result into `AgentContext.previous_results`
for the next agent to build on:

1. **Orchestrator Agent** (`orchestrator_agent.py`):
   - Triages the issue (category + priority) and plans which downstream stages apply.
2. **Repository Intelligence Agent** (`repository_intelligence_agent.py`):
   - Localizes suspect files via keyword matching (static) or LLM reasoning over
     the repository file listing and issue text (root-cause hypothesis).
3. **Patch Synthesis Agent** (`patch_synthesis_agent.py`):
   - Produces a remediation outline (static) or a proposed unified diff (LLM).
4. **Regression & Test Synthesis Agent** (`regression_test_agent.py`):
   - Drafts a test skeleton (static) or a full reproduction test (LLM).
5. **Security & Audit Agent** (`security_audit_agent.py`):
   - Screens the issue and proposed patch against CWE/OWASP-style regex rules
     (static) or an LLM-based review (LLM).

## Modes
Every agent works without any external dependency (`AI_MODE=static`, the
default) and with any OpenAI-compatible model endpoint (`AI_MODE=llm`,
configured via `AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY` in `.env`) - including
self-hosted vLLM deployments such as AMD Developer Cloud / ROCm. Both modes
are injected through the shared `LLMClient` (`llm_client.py`) so agents never
instantiate their own HTTP clients.

## Design Principles
- Agents are never coupled directly to HTTP routes; `agent_engine_service.py`
  builds `AgentContext` from persisted data and invokes `AgentPipeline`.
- A failing agent is caught by `BaseAgent.safe_run` and converted into an
  error `AgentResult` - it never aborts the rest of the pipeline.
- No agent re-parses source files or re-fetches Phase 3 data; everything an
  agent needs arrives through `AgentContext`.
