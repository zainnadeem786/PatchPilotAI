# Workers Layer (Architectural Placeholder — Phase 4)

## Purpose
This directory is reserved for background task processing and queue consumers in **Phase 4**.
In Phase 1, it exists solely as an architectural boundary to maintain separation of concerns.

## Planned Task Queue Architecture
- **Broker / Backend**: Redis 7 (configured in root `docker-compose.yml`).
- **Task Runner**: Distributed task queue (Celery or ARQ) executing asynchronous repo indexing, patch validation, and sandbox execution.
- **Isolation**: Heavy execution workloads will be executed off the FastAPI request/response event loop.
