# PatchPilot AI — Architecture Specification (Phase 1 Baseline)

This document specifies the technical design, architectural boundaries, data flow, and long-term evolutionary path for **PatchPilot AI**.

---

## 1. System Overview

PatchPilot AI is designed as a distributed, service-oriented platform separating high-speed user interface workflows from computationally intensive code analysis and autonomous multi-agent synthesis.

```mermaid
flowchart TD
    subgraph Client Tier ["Client Tier (Vercel)"]
        User(["Developer / Tech Lead"])
        NextUI["Next.js App Router (TypeScript)"]
        ClientAPI["lib/api.ts Client Abstraction"]
    end

    subgraph Backend Services Tier ["Backend Services Tier (Render)"]
        FastAPIApp["FastAPI Gateway (/api)"]
        ServiceLayer["Service Layer (services/)"]
        DBSession["Database Layer (db/session.py)"]
        Alembic["Alembic Migrations"]
    end

    subgraph Data & Queue Tier ["Data & Async Broker Tier (Managed Services)"]
        PG[(PostgreSQL 16 Relational DB)]
        RedisCache[(Redis 7 Task Broker & State)]
    end

    subgraph Agent & Worker Tier ["Future Agent & Worker Tier (Phase 4 & 6)"]
        Workers["Distributed Worker Pool (Celery / ARQ)"]
        AgentOrch["Orchestrator Agent"]
        RepoAgent["Repository Intelligence Agent"]
        PatchAgent["Patch Synthesis Agent"]
        TestAgent["Regression Test Agent"]
        AuditAgent["Security Audit Agent"]
    end

    subgraph External Ecosystem ["External Ecosystem"]
        GitHubAPI["GitHub API & Webhooks"]
    end

    User --> NextUI
    NextUI --> ClientAPI
    ClientAPI -->|HTTPS / REST| FastAPIApp
    FastAPIApp --> ServiceLayer
    ServiceLayer --> DBSession
    DBSession --> PG
    Alembic --> PG

    %% Future Phase Connections
    ServiceLayer -.->|Enqueue Tasks (Phase 4)| RedisCache
    RedisCache -.-> Workers
    Workers -.-> AgentOrch
    AgentOrch -.-> RepoAgent & PatchAgent & TestAgent & AuditAgent
    ServiceLayer -.->|Sync & PRs (Phase 5)| GitHubAPI
```

---

## 2. Frontend / Backend Architectural Boundaries

### Frontend Scope (`frontend/`)
- **Framework**: Next.js (TypeScript, React 19, Tailwind CSS).
- **Role**: Presentation, user session management, interactive diff viewing, patch acceptance/rejection, verification dashboard, and real-time execution monitoring.
- **Boundaries**:
  - The frontend **never** connects directly to PostgreSQL or Redis.
  - The frontend **never** executes Git operations or LLM calls directly.
  - All communication is proxied through the typed API client abstraction (`frontend/lib/api.ts`) against the FastAPI gateway using `NEXT_PUBLIC_API_URL`.

### Backend Scope (`backend/`)
- **Framework**: FastAPI (Python 3.11+ / 3.13+).
- **Role**: API routing, payload validation, database transactions, background task dispatching, and agent coordination.
- **Boundaries**:
  - Encapsulates all domain business logic, data models, and persistence.
  - Isolates external third-party API dependencies (e.g. GitHub REST/GraphQL, AI providers) inside dedicated service wrappers.

---

## 3. API $\to$ Service $\to$ Data Layered Architecture

To prevent route handler bloat and guarantee clean testability, all backend endpoints strictly follow a 3-tier separation:

```text
HTTP Request (GET /api/health)
      │
      ▼
1. API Router Layer (app/api/)
   • Validates incoming HTTP parameters & headers via Pydantic schemas.
   • Handles HTTP-level response statuses and CORS.
   • Injects dependencies (database sessions, current user).
      │
      ▼
2. Service Layer (app/services/)
   • Implements pure business logic, orchestration, and validation rules.
   • Independent of FastAPI request/response constructs.
   • Can be called interchangeably by API endpoints, CLI scripts, or background workers.
      │
      ▼
3. Data / Persistence Layer (app/db/ & app/models/)
   • SQLAlchemy 2.0 ORM models and session life-cycles (`get_db`).
   • Alembic schema versioning and transactional migrations.
   • Direct SQL queries or ORM transactions isolated from route handlers.
```

---

## 4. Database Layer & Migration Strategy

- **Relational Engine**: PostgreSQL 16.
- **Python Driver**: Modern `psycopg` (v3) binary driver (`postgresql+psycopg://...`).
- **ORM**: SQLAlchemy 2.0 with `declarative_base` in `app/db/base.py`.
- **Session Management**: Sessionmaker configured with `pool_pre_ping=True` in `app/db/session.py` to prevent stale connection drops.
- **Alembic Versioning**:
  - All schema mutations are tracked via versioned migration files in `backend/alembic/versions/`.
  - Migrations read `target_metadata` directly from `app.models.Base.metadata`.
  - The connection URL in `alembic.ini` is dynamically overridden by `app.core.config.settings.DATABASE_URL` in `alembic/env.py`.
  - **Phase 3 Schema**:
    - `repositories`: Persists verified GitHub metadata (`id`, `github_id`, `owner`, `name`, `full_name`, `description`, `default_branch`, `private`, `html_url`, `language`, `open_issues_count`, timestamps).
    - `issues`: Persists real GitHub issues metadata (`id`, `repository_id`, `github_issue_id`, `number`, `title`, `body`, `state`, `html_url`, `author`, timestamps).
    - Foreign key constraints with `ON DELETE CASCADE` ensure child issues are cleaned up automatically upon repository removal.
    - Zero AI-inferred fields are stored in the relational core (reserving AI fields for subsequent phases).

---

## 5. Future Agent Architecture (Phase 4 & 6 Design Blueprint)

The `backend/app/agents/` directory is reserved for autonomous multi-agent pipelines:

1. **Orchestrator Agent**:
   - Manages workflow state transitions: `Triage -> Root Cause Analysis -> Patch Generation -> Test Synthesis -> Static Audit -> Verification`.
2. **Repository Intelligence Agent**:
   - Indexes repository ASTs, call graphs, symbol tables, and commit histories to isolate faulty logic.
3. **Patch Synthesis Agent**:
   - Generates minimal surgical diffs fixing the underlying bug without altering adjacent behaviors or APIs.
4. **Regression & Test Synthesis Agent**:
   - Synthesizes automated reproduction tests verifying the fault before patch application and confirming pass status afterward.
5. **Security & Audit Agent**:
   - Validates generated patches against common CWE/OWASP vulnerabilities before pull-request submission.

---

## 6. GitHub Integration Architecture (Phase 3 Implemented)

- External communication with GitHub is encapsulated in `backend/app/services/github_service.py` via an asynchronous `httpx.AsyncClient`.
- **SSRF & Traversal Protection**:
  - `validate_repo_identifier` strictly validates repo owner and name using regex `^[a-zA-Z0-9_.-]+$`.
  - Directory traversal (`..`), path slashes, loopback addresses (`127.0.0.1`), private IP patterns, and reserved network hosts (`localhost`, `internal`, `loopback`) are rejected with `ValueError`.
- **Typed Error Hierarchy**:
  - `GitHubNotFoundError` (404)
  - `GitHubRateLimitError` (403 / 429)
  - `GitHubAuthError` (401)
  - `GitHubConfigurationError` (503 Service Unavailable when credentials are missing)
  - `GitHubAPIError` (502 Bad Gateway / Network Failures)
- **Timeout Enforcement**: Explicit 10-second request timeouts (`httpx.Timeout(10.0)`).
- **OAuth & Credentials**:
  - `GET /api/v1/github/auth/start` initiates user authorization flow.
  - `GET /api/v1/github/auth/callback` handles OAuth code-for-token exchange.
  - Credentials remain strictly server-side; tokens are never exposed to the frontend client.

---

## 7. Deployment Architecture

- **Frontend**: Hosted on **Vercel** with automatic CDN edge caching, SSL termination, and environment variable configuration (`NEXT_PUBLIC_API_URL`).
- **Backend API**: Hosted on **Render** (Web Service, Python environment) running `uvicorn app.main:app` behind Gunicorn/Uvicorn workers.
- **Database**: Managed PostgreSQL instance (Render PostgreSQL or Neon/Supabase).
- **Broker / Cache**: Managed Redis instance (Render Redis or Upstash).

---

## 8. Security & Compliance Baseline

1. **Zero Secret Leakage**:
   - `.env`, `.env.local`, and private keys are barred by `.gitignore`.
   - Only non-sensitive `.env.example` templates exist in source control.
2. **CORS Governance**:
   - Backend restricts allowed origins through `BACKEND_CORS_ORIGINS`.
3. **Local Isolation**:
   - Strictly project-local virtual environments (`backend/.venv/`) and Node modules (`frontend/node_modules/`).
4. **Sanitized Error Surfaces**:
   - Production API responses avoid leaking internal stack traces or database driver specifics.
