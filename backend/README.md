# PatchPilot AI — Backend Application

> Production-grade FastAPI gateway, GitHub REST service integration, and PostgreSQL persistence layer.

---

## 🏛️ Architecture & Layering

The PatchPilot AI backend strictly follows a 3-tier **API $\to$ Service $\to$ Data** separation to ensure clean testability, modularity, and maintainability:

```text
Frontend Client (Port 3000)
       │
       │ HTTP / JSON Request
       ▼
1. API Router Tier (app/api/v1/)
   • Pydantic v2 schemas validate input parameters and response payloads.
   • Injects database sessions via Depends(get_db).
   • Translates typed domain exceptions into standard HTTP error responses.
       │
       ▼
2. Service Tier (app/services/)
   • github_service.py: Async HTTP communication with GitHub REST API, SSRF validation, Link-header count parsing.
   • repository_service.py: Repository CRUD, query ordering, and metadata updates.
   • issue_service.py: Issue CRUD, query filtering, and PR-guarded issue ingestion.
       │
       ▼
3. Persistence Tier (app/models/ & app/db/)
   • SQLAlchemy 2.0 ORM models (Repository, Issue).
   • PostgreSQL 16 relational database via psycopg (v3) binary driver.
   • Alembic transactional database migrations (0001, 0002).
```

---

## 🔌 API Endpoints (Canonical v1)

All v1 routes are mounted under `/api/v1/...` while preserving the root `/api/health` backward-compatible contract:

### Health Verification
* `GET /api/health`: Root health verification endpoint (`{"status": "ok", "service": "patchpilot-backend"}`).
* `GET /api/v1/health`: Versioned health verification endpoint.

### Repository Management (`/api/v1/repositories`)
* `GET /api/v1/repositories`: List all connected repositories ordered by most recently updated. Returns separated `open_issues_count` and `open_pull_requests_count`.
* `POST /api/v1/repositories`: Connect a new GitHub repository:
  1. Validates repository `owner` and `name` against SSRF/traversal rules.
  2. Fetches repository metadata from GitHub.
  3. Calculates discrete Open Issues and Open Pull Requests counts.
  4. Persists or updates the record in PostgreSQL `repositories`.
  5. Ingests genuine GitHub issues into PostgreSQL `issues` (strictly excluding PRs).
* `GET /api/v1/repositories/{id}`: Retrieve detailed repository metadata by database ID.
* `GET /api/v1/repositories/{id}/issues`: Retrieve all synchronized issues for a specific repository.
* `GET /api/v1/repositories/{id}/contents`: Browse repository files and directories via GitHub API.

### Issue Ingestion & Querying (`/api/v1/issues`)
* `GET /api/v1/issues`: List all tracked issues across connected repositories. Supports optional query parameters:
  * `repository_id`: Filter issues belonging to a specific repository.
  * `state`: Filter by issue state (`open` or `closed`).
  * `skip` & `limit`: Pagination offset and limit.
* `GET /api/v1/issues/{id}`: Retrieve specific issue record by primary key ID.

### GitHub Integration & OAuth (`/api/v1/github`)
* `GET /api/v1/github/auth/start`: Generates GitHub OAuth authorization URL with CSRF state token.
* `GET /api/v1/github/auth/callback`: Exchanges temporary authorization code for access token.

---

## 🛡️ GitHub Integration & Issue/PR Handling

Communication with GitHub is encapsulated in [`app/services/github_service.py`](file:///d:/PatchPilot/backend/app/services/github_service.py).

### 1. SSRF & Path Traversal Safeguards
All repository inputs are validated by `validate_repo_identifier`:
* Matches strict format regex: `^[a-zA-Z0-9_.-]+$`.
* Rejects full URLs, protocol schemes, and path slashes.
* Rejects IPv4 addresses (e.g. `127.0.0.1`) and reserved hostnames (`localhost`, `0.0.0.0`, `internal`, `loopback`).
* File browsing paths reject directory traversal sequences (`..`).

### 2. Issue vs. Pull Request Count Separation
GitHub's repository metadata endpoint reports a combined `open_issues_count` that aggregates open issues and open pull requests. PatchPilot separates them deterministically:
1. `github_service.get_repository_counts(owner, name, combined_count)` makes a minimal query:
   ```text
   GET /repos/{owner}/{name}/pulls?state=open&per_page=1
   ```
2. Inspects the HTTP response `Link` header:
   * If a `rel="last"` pagination link is present (`...page=(\d+)...; rel="last"`), extracts the total open pull request count without downloading objects.
   * If no `rel="last"` is present, checks whether the response list has 0 or 1 item.
3. Computes pure open issue count:
   $$\text{open\_issues\_count} = \max(0, \text{combined\_count} - \text{open\_pull\_requests\_count})$$
4. Persists both values as separate columns in PostgreSQL:
   * `open_issues_count`: actual open issues.
   * `open_pull_requests_count`: actual open pull requests.

### 3. Issue Synchronization & PR Exclusion
1. `github_service.list_repository_issues()` queries GitHub Search API (`q=repo:{owner}/{name} is:issue state:{state}`).
   * The `is:issue` search filter inherently excludes Pull Requests at GitHub's search index level, returning real issues directly even in repositories with dozens of leading PRs (such as FastAPI).
   * Falls back to multi-page `/repos/{owner}/{name}/issues` queries if the search API is rate-limited.
2. `issue_service.sync_issues_for_repository()` enforces a secondary defensive check:
   ```python
   for item in github_issues:
       if "pull_request" in item:
           continue
   ```
   Ensures Pull Requests are never written into the `issues` table.

---

## 🗄️ Relational Database & Migrations

* **Database Engine**: PostgreSQL 16 (running locally on port `5433` via Docker Compose).
* **Driver**: `psycopg` (v3) binary driver (`postgresql+psycopg://postgres:postgres@localhost:5433/patchpilot`).
* **ORM**: SQLAlchemy 2.0.

### Database Models (`app/models/`)
* **`Repository` (`repositories`)**:
  * `id`: Integer primary key (autoincrement).
  * `github_id`: BigInteger unique GitHub repository ID.
  * `owner`: String account or organization name.
  * `name`: String repository name.
  * `full_name`: String unique `owner/name` index.
  * `description`: Text repository summary.
  * `default_branch`: String default branch (e.g. `main`, `master`).
  * `private`: Boolean visibility flag.
  * `html_url`: String GitHub URL.
  * `language`: String primary programming language.
  * `open_issues_count`: Integer actual open issues count.
  * `open_pull_requests_count`: Integer actual open pull requests count.
  * `created_at` & `updated_at`: DateTime with timezone.
  * Relationship: `issues` with cascading deletion (`cascade="all, delete-orphan"`).
* **`Issue` (`issues`)**:
  * `id`: Integer primary key.
  * `repository_id`: Foreign key referencing `repositories.id` with `ON DELETE CASCADE`.
  * `github_issue_id`: BigInteger unique GitHub issue ID.
  * `number`: Integer issue number within repository.
  * `title`: String issue title.
  * `body`: Text issue description.
  * `state`: String (`open` or `closed`).
  * `html_url`: String GitHub issue URL.
  * `author`: String issue reporter login.
  * `created_at` & `updated_at`: DateTime with timezone.

### Alembic Migrations (`backend/alembic/versions/`)
* **`0001_initial_repositories_issues.py`**: Creates `repositories` and `issues` tables, indices, and foreign key cascades.
* **`0002_add_open_pull_requests_count.py`**: Adds `open_pull_requests_count` integer column to `repositories`.
* **`0003_add_phase6_agent_artifacts.py`**: Adds `analysis_runs`, `patches`, `regression_tests`, `security_findings`, and `release_readiness` tables.
* **`0004_add_validation_runs.py`**: Adds `validation_runs` table tracking isolated Docker test execution.

To apply migrations:
```powershell
.\.venv\Scripts\alembic.exe upgrade head
```

---

## 🔒 Phase 7 — Isolated Patch Validation Sandbox

PatchPilot uses a **dedicated sandbox Docker image** (`patchpilot-sandbox:python3.13`) for running generated regression tests and patches.

### Security Guarantees
* **Isolated from Application Container**: The sandbox image contains only minimal test tooling (`python:3.13-slim` + `pytest 8.3.3`) and contains zero application code (`FastAPI`, `Alembic`) or database connectors.
* **No Host Code Execution**: Generated patches and tests execute exclusively inside ephemeral, resource-bounded Docker containers mounted only to a temporary workspace (`tempfile.mkdtemp`).
* **Network Isolation**: All test executions run with `--network none`. The container cannot connect to GitHub, LLM providers, internal databases, or internet hosts.
* **Zero Secrets**: No backend environment variables or secrets (`OPENAI_API_KEY`, `GITHUB_TOKEN`, `DATABASE_URL`) are forwarded into the container. Secret files (`.env`, `*.pem`, `*.key`) are filtered from the workspace.
* **Resource Limits & Timeouts**: Ephemeral containers are constrained to `--memory=512m`, `--cpus=1.0`, `--security-opt no-new-privileges`, `--cap-drop ALL`, and a hard 60-second execution timeout.
* **Production Deployment Note**: Production deployment requires a runtime capable of executing isolated containers. Standard Render web services do not support nested Docker execution; when container execution is unavailable in production, the service safely reports `validation_unavailable` without crashing or falsely passing.

### Building the Sandbox Image Locally
```bash
docker build -t patchpilot-sandbox:python3.13 -t patchpilot-sandbox:latest backend/validation
```


## 🧪 Testing Suite

Tests are located in `backend/tests/` and run against a fast, in-memory SQLite database (`sqlite:///:memory:`) using FastAPI `TestClient`:

* **Zero External Credential Dependencies**: Tests run hermetically without requiring live GitHub tokens.
* **Coverage**:
  * `tests/test_repositories.py`: 8 tests covering empty states, connect repo, get by ID, 404 handling, SSRF input validation, 503 unconfigured credentials, and Issue/PR count separation.
  * `tests/test_issues.py`: 6 tests covering empty listing, issue filtering by state/repo, single issue retrieval, 404 handling, PR exclusion during sync, and direct service-level PR exclusion.
  * `tests/test_github_service.py`: 11 tests covering valid/invalid identifier regex, SSRF rejection, 404 mapping, rate limit mapping, timeout mapping, OAuth config check, PR filtering in issue listing, and `get_repository_counts` (Link header parsing, zero PRs, single PR).
  * `tests/test_health.py`: 3 tests verifying backward-compatible `/api/health` and `/api/v1/health` contracts.

Run the test suite:
```powershell
cd d:\PatchPilot\backend
.\.venv\Scripts\python.exe -m pytest -q
```
*(Verified: 28 passed, 0 failed in 6.10s)*

---

## 🚀 Running the Backend

All dependencies are strictly project-local (`backend/.venv/`).

```powershell
cd d:\PatchPilot\backend

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install project-local dependencies
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# Run migrations against PostgreSQL
.\.venv\Scripts\alembic.exe upgrade head

# Start development server
.\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
```

* API Gateway: `http://localhost:8000`
* Swagger Documentation: `http://localhost:8000/docs`
* ReDoc Documentation: `http://localhost:8000/redoc`
