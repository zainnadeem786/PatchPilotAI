# PatchPilot AI

> Autonomous Developer Platform for Repository Intelligence, Patch Synthesis, and Release Verification.

---

## 🎯 System Overview

**PatchPilot AI** is an agentic developer platform designed to help engineering teams understand complex repositories, investigate bug reports, synthesize surgically precise code patches, automatically generate regression tests, conduct static security audits, and evaluate release readiness before deployment.

### Current Implementation Status

This repository contains the verified implementation of **Phases 1 through 7**:

* **Phase 1 — Foundation & Architecture**: Complete backend gateway, frontend shell, isolated local virtual environments, and baseline testing.
* **Phase 2 — Professional UI/UX**: Dual-theme high-density developer interface (warm cream light mode & technical slate dark mode), bespoke vector branding, and 10 core application workspaces.
* **Phase 3 — Backend & GitHub Integration**: Relational persistence in PostgreSQL 16, Alembic migrations, GitHub REST integration with strict SSRF defense, automated Issue vs. Pull Request count separation, and live API synchronization.
* **Phase 4 & 6 — AI Agent Engine & LLM Runtime**: Six-stage pipeline (Orchestrator, Repository Intelligence, Patch Synthesis, Regression Test Synthesis, Security Audit, Release) with dual static/LLM runtime modes, bounded repository context ingestion, and durable artifact persistence.
* **Phase 7 — Isolated Patch Validation & Test Execution**: Dedicated sandboxed test execution using `patchpilot-sandbox:python3.13` with disabled networking (`--network none`), strict resource limits ($512\,\text{MB}$, $1.0$ CPU), ephemeral workspaces, path traversal guards, secret file filtering, and deterministic release gates.

> [!IMPORTANT]
> **Safety Invariants & Human-in-the-Loop Model**
> * **No Host Code Execution**: AI-generated code is executed exclusively inside an isolated Docker sandbox with `--network none`.
> * **Proposals Only**: Patches and tests are data artifacts. PatchPilot **never** automatically commits, pushes, merges, or deploys code.
> * **Deterministic Release Gating**: Release readiness requires human engineering approval (`human_review_required`). Validation failures, timeouts, or high-severity security findings strictly block releases.


---

## 🏗️ Architecture & Data Flow

```text
Next.js 15 Client Tier (Port 3000)
       │
       │ HTTP / JSON REST Calls
       ▼
FastAPI Gateway Tier (Port 8000)
       │
       ├── API Layer (app/api/v1/)
       │    └── Pydantic v2 Request/Response Validation
       │
       ├── Service Layer (app/services/)
       │    ├── GitHubService (Async HTTP, SSRF defense, Link-header count parser)
       │    ├── RepositoryService (Database CRUD & metadata sync)
       │    └── IssueService (Issue ingestion & PR exclusion)
       │
       ├── Data & Persistence Layer (app/models/ & app/db/)
       │    ├── SQLAlchemy 2.0 ORM
       │    ├── Alembic Migrations (0001, 0002)
       │    └── PostgreSQL 16 (Repositories, Issues)
       │
       └── Task & Cache Broker Foundation (app/core/)
            └── Redis 7
```

### Current Repository Connection & Issue Synchronization Flow

```text
1. User clicks "Connect Repo" in Next.js UI (or POST /api/v1/repositories)
   │
2. FastAPI validates owner/name format against SSRF and traversal safeguards
   │
3. GitHubService retrieves repository metadata from GitHub REST API
   │
4. GitHubService queries /repos/{owner}/{name}/pulls?state=open&per_page=1
   └── Parses Link header (rel="last") to determine exact open PR count
   └── Computes pure open issue count: max(0, combined_count - open_pull_requests_count)
   │
5. RepositoryService persists repository record in PostgreSQL repositories table
   │
6. GitHubService queries issues via GitHub Search API (is:issue state:open)
   └── Filters out any item with pull_request attribute (double defense)
   │
7. IssueService syncs genuine issues into PostgreSQL issues table
   │
8. Frontend updates /repositories and /issues views with live, verified data
```

---

## 🛠️ Technology Stack

| Layer | Technologies | Responsibilities |
|---|---|---|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS | High-density developer UI, dual-theme system, typed API abstraction (`lib/api.ts`), responsive data grids. |
| **Backend Gateway** | FastAPI, Uvicorn, Python 3.11+ / 3.13+, Pydantic v2 | REST routing, input validation, error mapping, dependency injection (`get_db`), OpenAPI documentation (`/docs`). |
| **HTTP Client** | HTTPX (AsyncClient) | GitHub REST API communication, explicit 10s timeouts, token-free connection, typed exceptions. |
| **Database** | PostgreSQL 16, SQLAlchemy 2.0, Psycopg 3, Alembic | Relational persistence, transactional migrations (`0001`, `0002`), foreign key cascading. |
| **Cache & Queue** | Redis 7 | State broker and async queue foundation (prepared for Phase 4 workers). |
| **Testing** | Pytest, AnyIO, FastAPI TestClient, SQLite (In-Memory) | Hermetic, zero-credential integration testing for all services and endpoints. |

---

## 📁 Repository Structure

```text
PatchPilot/
├── frontend/                     # Next.js 15 Frontend Application
│   ├── app/                      # App Router pages (/repositories, /issues, /agents, etc.)
│   ├── components/               # Layout, repository modals, diff viewers, icons
│   ├── lib/api.ts                # Typed client communicating with FastAPI
│   ├── types/                    # Shared TypeScript domain and API contracts
│   └── package.json              # Project-local frontend dependencies
│
├── backend/                      # FastAPI Python Backend Application
│   ├── app/
│   │   ├── api/                  # API routers (v1/repositories, v1/issues, v1/github)
│   │   ├── core/                 # App settings, environment configuration
│   │   ├── db/                   # Database sessionmaker and Base declaration
│   │   ├── models/               # SQLAlchemy models (Repository, Issue)
│   │   ├── schemas/              # Pydantic validation schemas
│   │   ├── services/             # GitHubService, RepositoryService, IssueService
│   │   ├── agents/               # Reserved placeholder for Phase 4 multi-agent engine
│   │   └── workers/              # Reserved placeholder for async worker pool
│   ├── alembic/                  # Database migration scripts (0001, 0002)
│   ├── tests/                    # 28 hermetic unit and integration tests
│   └── requirements.txt          # Project-local Python dependencies
│
├── docs/
│   └── ARCHITECTURE.md           # System architecture specification
├── docker-compose.yml            # PostgreSQL 16 (Port 5433:5432) & Redis 7 (Port 6379)
├── .env.example                  # Root environment blueprint
└── README.md                     # Root project documentation
```

---

## 💻 Local Development Setup (Windows / PowerShell)

All dependencies are strictly **project-local** (`backend/.venv/` and `frontend/node_modules/`). No global packages are modified or required.

### Prerequisites
* **Node.js**: v20+ / v22+
* **Python**: v3.11+ / v3.13+
* **Docker & Docker Compose**: For local PostgreSQL and Redis

---

### Step 1: Environment Variables Setup

```powershell
# Root configuration
Copy-Item .env.example .env

# Backend configuration
Copy-Item backend\.env.example backend\.env

# Frontend configuration
Copy-Item frontend\.env.example frontend\.env.local
```

---

### Step 2: Start Local Infrastructure with Docker

Start PostgreSQL on port `5433` and Redis on port `6379`:

```powershell
docker compose up -d
```

Verify services are healthy:
```powershell
docker ps
```

---

### Step 3: Backend Setup & Migrations

1. Open PowerShell and navigate to `backend/`:
   ```powershell
   cd d:\PatchPilot\backend
   ```

2. Activate the project-local virtual environment:
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

3. Install project-local dependencies (if not already installed):
   ```powershell
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   ```

4. Apply database migrations to PostgreSQL:
   ```powershell
   .\.venv\Scripts\alembic.exe upgrade head
   ```

5. Run the automated test suite:
   ```powershell
   .\.venv\Scripts\python.exe -m pytest -q
   ```
   *(Expected: 28 passed)*

6. Start the FastAPI development server:
   ```powershell
   .\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
   ```

* API Base URL: `http://localhost:8000`
* Interactive API Documentation (Swagger): `http://localhost:8000/docs`
* Health Endpoint: `http://localhost:8000/api/health`

---

### Step 4: Frontend Setup

1. Open a new PowerShell terminal and navigate to `frontend/`:
   ```powershell
   cd d:\PatchPilot\frontend
   ```

2. Install project-local dependencies (if not already installed):
   ```powershell
   npm install
   ```

3. Verify production compilation and type safety:
   ```powershell
   npm run build
   ```
   *(Expected: 14/14 static & dynamic routes compiled, Exit code 0)*

4. Start the Next.js development server:
   ```powershell
   npm run dev
   ```

* Frontend Dashboard: `http://localhost:3000`
* Connected Repositories View: `http://localhost:3000/repositories`
* Synchronized Issues View: `http://localhost:3000/issues`

---

## 🔌 API Overview (Canonical v1)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health verification endpoint (backward-compatible). |
| `GET` | `/api/v1/health` | Versioned health verification endpoint. |
| `GET` | `/api/v1/repositories` | List all tracked repositories with separated issue and PR counts. |
| `POST` | `/api/v1/repositories` | Connect a GitHub repository, fetch metadata, separate Issue/PR counts, and sync issues. |
| `GET` | `/api/v1/repositories/{id}` | Retrieve tracked repository details by database ID. |
| `GET` | `/api/v1/repositories/{id}/issues` | Retrieve all synchronized issues for a specific repository. |
| `GET` | `/api/v1/repositories/{id}/contents` | Browse files and directories in the repository tree via GitHub API. |
| `GET` | `/api/v1/issues` | List all tracked issues across repositories (supports `repository_id` and `state` filters). |
| `GET` | `/api/v1/issues/{id}` | Retrieve specific issue details by primary key ID. |
| `POST` | `/api/v1/issues/{id}/analyze` | Run the Phase 4 AI Agent Engine pipeline against a tracked issue and return aggregated agent findings. |
| `GET` | `/api/v1/github/auth/start` | Generate GitHub OAuth authorization URL with state parameter. |
| `GET` | `/api/v1/github/auth/callback` | Exchange temporary GitHub OAuth code for access token. |

---

## 🧪 Current Verification Status

* **Backend Tests**: 28 passed in 6.10s (`pytest -q` on Python 3.13).
* **Frontend Build**: 14 routes compiled cleanly with 0 TypeScript/lint errors (`npm run build` on Next.js 15.5.25).
* **Database Verification**: Real PostgreSQL queries against `patchpilot-postgres` on port `5433` verify:
  * Repository `fastapi/fastapi` stores `open_issues_count = 1` and `open_pull_requests_count = 81`.
  * Issues table stores the actual GitHub Issue `#10370` and excludes all 81 Pull Requests.
* **Security Checks**: Strict SSRF and directory traversal defenses validated on all repository input parameters.

---

## 🔮 Roadmap: Phase 4 (AI Agent Engine) — Implemented

Phase 3 established the stable data, API, and persistence foundation. **Phase 4** introduces the autonomous engineering intelligence, implemented in `backend/app/agents/`:

1. **Orchestrator Agent**: Triages the issue lifecycle (category, priority, planned stages) ahead of diagnosis, patch synthesis, test synthesis, and audit.
2. **Repository Intelligence Agent**: Keyword-based (static) or LLM-based root cause localization against the repository's file tree. Full AST/call-graph indexing remains future work.
3. **Patch Synthesis Agent**: Generating surgical unified diffs solving detected faults (LLM mode) or a remediation outline (static mode).
4. **Regression Test Synthesis Agent**: Automatically synthesizing tests that reproduce the failure before the patch and pass after application.
5. **Security Audit Agent**: Evaluating the issue and any proposed patch against CWE/OWASP vulnerability patterns.

Trigger the pipeline via `POST /api/v1/issues/{id}/analyze`. See `backend/app/agents/README.md` for the full design.

### Next Up
* Distributed async worker pool (Celery/ARQ) to run the pipeline off the request/response cycle.
* Automatic pull-request creation from synthesized patches.
* Sandboxed autonomous test execution and release-gate approval intelligence.
