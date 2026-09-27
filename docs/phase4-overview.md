# Phase 4 Overview — AI Agent Engine

## What shipped

Phase 4 implements a 5-agent pipeline (`OrchestratorAgent`,
`RepositoryIntelligenceAgent`, `PatchSynthesisAgent`,
`RegressionTestSynthesisAgent`, `SecurityAuditAgent`) that runs against a
tracked GitHub issue and its repository, in either a deterministic static
mode (no API key required) or against any OpenAI-compatible LLM endpoint.
See `docs/agent-architecture.md` for the full per-agent breakdown, and
`backend/app/agents/README.md` for the package-level design notes.

## Correcting the original agent count

The initial PR description (and an early docs draft) listed **7 agents** -
`LanguageStructureAgent`, `BugCorrectnessAgent`, `SecurityAgent`,
`PerformanceComplexityAgent`, `RefactorAgent`, `TestPlannerAgent`, and
`ExecutiveSummaryAgent` - reflecting an original per-file, static-analysis
design that predates this repository's actual GitHub-issue-centric data
model. What was actually built instead follows this repo's own architecture
blueprint (`docs/ARCHITECTURE.md` section 5): **5 agents**, none of which
share a name with the original list. This document reconciles the two so
reviewers can see what happened to each originally-planned responsibility:

| Originally planned | Status |
|---|---|
| `LanguageStructureAgent` | Not needed as a separate agent - repository language is already known from Phase 3 GitHub metadata (`Repository.language`); `OrchestratorAgent` covers scope/triage. |
| `BugCorrectnessAgent` | Partially covered - `SecurityAuditAgent` covers the memory-safety/injection-adjacent subset; general correctness review is not implemented. |
| `SecurityAgent` | Implemented as `SecurityAuditAgent` (injection, eval/exec, hardcoded secrets, XSS patterns). |
| `PerformanceComplexityAgent` | **Not implemented.** |
| `RefactorAgent` | **Not implemented.** |
| `TestPlannerAgent` | Partially covered - `RegressionTestSynthesisAgent` drafts reproduction tests, but does not plan fuzz/load/integration test ideas. |
| `ExecutiveSummaryAgent` | Not a separate agent - `AgentPipeline._build_roadmap` consolidates all findings into a severity-ranked roadmap as part of `EngineResult`. |

> PerformanceComplexityAgent and RefactorAgent are deferred to Phase 5.

No stub or placeholder implementations were added for these two to make the
count look like 7 - Phase 4 ships only the 5 agents listed in
`docs/agent-architecture.md`.
