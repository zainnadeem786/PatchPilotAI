# Agents Layer (Architectural Placeholder — Phase 6)

## Purpose
This directory is reserved for the multi-agent AI engine in **Phase 6**.
In Phase 1, it exists solely as an architectural boundary to maintain separation of concerns.

## Planned Agent Hierarchy
1. **Orchestrator Agent**:
   - Manages workflow state machine (Analysis -> Patch -> Regression Test -> Verification).
2. **Repository Intelligence Agent**:
   - Parses ASTs, builds symbol graphs, and identifies suspect code paths.
3. **Patch Generation Agent**:
   - Produces minimal, context-aware code diffs solving root causes without side effects.
4. **Regression & Test Synthesis Agent**:
   - Generates deterministic pytest/jest reproduction tests proving the bug and patch efficacy.
5. **Security & Static Audit Agent**:
   - Checks AST for vulnerability introductions and policy compliance.

## Design Principles
- Agents must never be coupled directly to HTTP routes.
- Communication will flow through services and asynchronous worker tasks.
