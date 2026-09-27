# PatchPilot Dedicated Validation Sandbox

## Purpose

The PatchPilot Validation Sandbox is a minimal, dedicated, reproducible Docker environment designed exclusively for executing AI-generated regression tests and proposed patches in complete isolation.

It is decoupled from the PatchPilot application server (`FastAPI`) and never contains application code, database connectors, or production credentials.

## Specifications

- **Base Image**: `python:3.13-slim`
- **Python Version**: 3.13.15
- **Pytest Version**: 8.3.3
- **Image Tag**: `patchpilot-sandbox:python3.13` (also aliased as `patchpilot-sandbox:latest`)
- **Default Workdir**: `/workspace`
- **Default Command**: `pytest`

## Security & Isolation Guarantees

1. **Network Disabled (`--network none`)**:
   The sandbox container runs with all networking disabled. It cannot connect to GitHub, LLM providers (OpenAI/Anthropic/Gemini), PostgreSQL, Redis, or arbitrary internet hosts.
2. **Resource Boundaries**:
   Containers execute with strict memory (`512MB`) and CPU (`1.0`) limits, with a hard 60-second execution timeout.
3. **No Privileges**:
   Executes with `--security-opt no-new-privileges` and `--cap-drop ALL`. Privileged mode (`--privileged`) is strictly prohibited.
4. **Secret-Free**:
   No environment variables containing backend secrets (`GITHUB_TOKEN`, `OPENAI_API_KEY`, `DATABASE_URL`) are forwarded into the container. Secret files (`.env`, `*.pem`, `*.key`) are filtered from the mounted workspace.
5. **Isolated Workspace**:
   Files are written into an ephemeral host directory (`tempfile.mkdtemp`), mounted to `/workspace:rw`, and removed immediately in a `finally` block when validation finishes. The host repository is never modified.

## Building the Image

To build or rebuild the sandbox image locally:

```bash
docker build -t patchpilot-sandbox:python3.13 -t patchpilot-sandbox:latest backend/validation
```

## Verification

Verify Python and Pytest inside the sandbox:

```bash
docker run --rm patchpilot-sandbox:python3.13 python --version
docker run --rm --network none patchpilot-sandbox:python3.13 pytest --version
```
