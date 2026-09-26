# Agents Layer (AI Agent Engine — Phase 4 + Phase 5)

## Purpose
This directory implements PatchPilot's multi-agent AI engine, wired to the
Phase 3 repository/issue data model via `app/services/agent_engine_service.py`
and exposed through `POST /api/v1/issues/{issue_id}/analyze`.

The canonical agent registry is available at `GET /api/v1/agents`.

## Canonical Six-Agent Pipeline

## Agent Pipeline
Agents run in this order, each folding its result into `AgentContext.previous_results`
for the next agent to build on:

1. **Orchestrator Agent** (`orchestrator_agent.py`):
   - Triages the issue (category + priority) and plans which downstream stages apply.
   - Static mode uses keyword heuristics; LLM mode uses model-backed reasoning.

2. **Repository Intelligence Agent** (`repository_intelligence_agent.py`):
   - Identifies repository files most likely related to the issue.
   - Static mode: keyword matching against the top-level file tree.
   - LLM mode: model-assisted root-cause hypothesis over the file listing.
   - Does **not** perform full AST or symbol-graph analysis.

3. **Patch Synthesis Agent** (`patch_synthesis_agent.py`):
   - Produces a manual remediation outline referencing suspect files (static mode)
     or a proposed unified diff (LLM mode).
   - No code is automatically committed or pushed.

4. **Regression & Test Synthesis Agent** (`regression_test_agent.py`):
   - Drafts a language-appropriate test skeleton (static) or a full reproduction test (LLM).
   - Generated tests are **not** automatically executed.
   - Static mode clearly labels output as a skeleton, not a passing test.

5. **Security & Audit Agent** (`security_audit_agent.py`):
   - Screens the issue text and proposed patch against CWE/OWASP-aligned regex rules
     (static mode) or an LLM-based review (LLM mode).
   - Prompt-injection protection: all issue/repository content is treated as untrusted
     and wrapped in explicit XML delimiters in all prompts.

6. **Release Agent** (`release_agent.py`):
   - Evaluates whether the pipeline output is ready for **human release approval**.
   - Consumes outputs from all five preceding agents.
   - Checks: patch readiness, regression test status, security findings, pipeline health.
   - Produces structured `release_ready`, `status`, `blocking_reasons`, and `warnings`.
   - **Never** commits, pushes, merges, deploys, or creates releases automatically.
   - Human engineering approval is always required.

## Result Data Shape (ReleaseAgent)
```json
{
  "agent_name": "release",
  "status": "success",
  "mode": "static",
  "summary": "...",
  "findings": [...],
  "data": {
    "release_ready": true,
    "status": "human_review_required",
    "blocking_reasons": [],
    "warnings": ["Static analysis mode — LLM-assisted reasoning unavailable.", ...]
  }
}
```

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
configured via `AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY` in `.env`) — including
configured via `AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY` in `.env`) - including
self-hosted vLLM deployments such as AMD Developer Cloud / ROCm. Both modes
are injected through the shared `LLMClient` (`llm_client.py`) so agents never
instantiate their own HTTP clients.

## Design Principles
- Agents are never coupled directly to HTTP routes; `agent_engine_service.py`
  builds `AgentContext` from persisted data and invokes `AgentPipeline`.
- A failing agent is caught by `BaseAgent.safe_run` and converted into an
  error `AgentResult` — it never aborts the rest of the pipeline.
- No agent re-parses source files or re-fetches Phase 3 data; everything an
  agent needs arrives through `AgentContext`.
- Prompt-injection protections (SEC-01): all user/GitHub content in LLM prompts
  is wrapped in `<tag>` delimiters with explicit system-level untrusted-data
  instructions. This applies to all six agents.
- Static SQL injection heuristics (SEC-03) are preserved in `SecurityAuditAgent`.

## Agent Registry API
`GET /api/v1/agents` returns the canonical ordered agent list as JSON.
This is the single source of truth for agent count and metadata across the
frontend Agents page and sidebar statistics.
  error `AgentResult` - it never aborts the rest of the pipeline.
- No agent re-parses source files or re-fetches Phase 3 data; everything an
  agent needs arrives through `AgentContext`.
