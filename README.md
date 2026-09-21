# PatchPilot AI

> Autonomous Developer Platform for Repository Intelligence, Patch Synthesis, and Release Verification.

---

## 🎯 Purpose

**PatchPilot AI** is an agentic developer platform that helps engineering teams understand complex codebases, diagnose bugs and performance regressions, synthesize precise patches, automatically generate reproduction and regression tests, perform static security audits, and assess release readiness before deployment.

This repository currently hosts the **Phase 1: Foundation & Architecture** milestone.

---

## 🏗️ Architecture

The high-level system architecture follows a clean multi-tier topology designed for rapid local iteration and seamless cloud deployment:

```text
Vercel (Client Hosting)
   │
   ▼
Next.js 15 (TypeScript, App Router) [Port 3000]
   │
   │ HTTPS / JSON API
   ▼
FastAPI (Python Backend) [Port 8000]
   │
   ├── API Layer (/api/health, /api/v1/...)
   ├── Service Layer (Business Logic)
   ├── Database Layer (SQLAlchemy + Alembic Migrations)
   ├── Future Agent Orchestrator (Phase 6)
   │
   ├────────────────────────┐
   ▼                        ▼
PostgreSQL 16             Redis 7
(Metadata & Patches)      (Task Queue & Caching - Phase 4)
                            │
                            ▼
                      Future Background Workers (Celery / ARQ)
                            │
                            ▼
                      GitHub API Integration (Phase 5)
```

---

## 💻 Local Development Setup (Windows / PowerShell)

All dependencies are strictly **project-local** (`frontend/node_modules/` and `backend/.venv/`). No global packages are required or modified.

### Prerequisites
- **Node.js**: v20+ / v22+
- **Python**: v3.11+ / v3.13+
- **Git**: Installed
- *(Optional)* **Docker & Docker Compose**: For local PostgreSQL and Redis

---

### Step 1: Environment Variables Setup

Copy the example environment templates:

```powershell
# Root configuration
Copy-Item .env.example .env

# Backend configuration
Copy-Item backend\.env.example backend\.env

# Frontend configuration
Copy-Item frontend\.env.example frontend\.env.local
```

---

### Step 2: (Optional) Local Services with Docker

If Docker is installed on your machine, start PostgreSQL and Redis with a single command:

```powershell
docker compose up -d
```

*(Note: Phase 1 backend runs standalone and the health check functions even if Docker services are not running).*

---

### Step 3: Backend Setup (FastAPI + Python)

1. Open PowerShell and navigate to the `backend` directory:
   ```powershell
   cd d:\PatchPilot\backend
   ```

2. Create a project-local virtual environment:
   ```powershell
   python -m venv .venv
   ```

3. Activate the virtual environment:
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

4. Install project-local backend dependencies:
   ```powershell
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   ```

5. Run test suite to verify installation:
   ```powershell
   .\.venv\Scripts\python.exe -m pytest -v
   ```

6. Start the FastAPI development server:
   ```powershell
   .\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
   ```

- API Base URL: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/api/health`

---

### Step 4: Frontend Setup (Next.js + TypeScript)

1. Open a new PowerShell terminal and navigate to the `frontend` directory:
   ```powershell
   cd d:\PatchPilot\frontend
   ```

2. Install project-local dependencies:
   ```powershell
   npm install
   ```

3. Build or typecheck the frontend:
   ```powershell
   npm run build
   ```

4. Start the Next.js development server:
   ```powershell
   npm run dev
   ```

- Frontend UI: `http://localhost:3000`

---

## 📁 Monorepo Structure

```text
PatchPilot/
├── frontend/                     # Next.js 15 + TypeScript Frontend
│   ├── app/                      # App router pages & layouts
│   ├── components/               # React UI components
│   ├── lib/                      # API client abstractions
│   ├── types/                    # Shared TypeScript interfaces
│   ├── public/                   # Static assets
│   ├── package.json              # Project-local frontend dependencies
│   ├── tsconfig.json             # TypeScript configuration
│   └── tailwind.config.ts        # Tailwind CSS styling
│
├── backend/                      # Python + FastAPI Backend
│   ├── app/
│   │   ├── main.py               # FastAPI entrypoint & middleware
│   │   ├── api/                  # API routing layer
│   │   ├── core/                 # Config & environment settings
│   │   ├── db/                   # SQLAlchemy engine, session & Base
│   │   ├── schemas/              # Pydantic validation schemas
│   │   ├── services/             # Core business logic layer
│   │   ├── models/               # SQLAlchemy models (Phase 3 placeholder)
│   │   ├── agents/               # AI Agent layer (Phase 6 placeholder)
│   │   └── workers/              # Background workers (Phase 4 placeholder)
│   ├── alembic/                  # Database migration management
│   ├── tests/                    # Pytest verification suite
│   ├── requirements.txt          # Project-local backend dependencies
│   └── alembic.ini               # Alembic configuration
│
├── docs/
│   └── ARCHITECTURE.md           # System architecture specification
│
├── docker-compose.yml            # Local PostgreSQL & Redis services
├── .gitignore                    # Version control ignore definitions
├── .env.example                  # Root environment variables blueprint
└── README.md                     # Project overview and developer handbook
```

---

## 🛡️ Security Baseline

- **No Hardcoded Secrets**: All dynamic credentials rely exclusively on environment variables.
- **Git Safety**: `.env` and `.env.*.local` are strictly ignored in `.gitignore`.
- **Zero Global Contamination**: Python uses local `.venv/`; Node uses local `node_modules/`.
- **CORS Restricted**: Controlled strictly via `BACKEND_CORS_ORIGINS`.
