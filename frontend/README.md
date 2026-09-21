# PatchPilot AI — Frontend Application

> Modern developer platform frontend built with Next.js 15, TypeScript, and Tailwind CSS.

---

## 🏛️ Architecture & Overview

The PatchPilot AI frontend provides an information-dense, high-precision developer experience inspired by Linear, GitHub, and Vercel. It is built using the **Next.js App Router** with full TypeScript type safety and a bespoke dual-theme system.

```text
User Interaction
       │
       ▼
Next.js Pages & Client Components (frontend/app/)
       │
       ▼
Typed API Client Abstraction (frontend/lib/api.ts)
       │
       ▼ [HTTP/JSON via NEXT_PUBLIC_API_URL]
FastAPI Gateway (backend:8000)
       │
       ▼
PostgreSQL 16 & GitHub REST API
```

---

## 🎨 Dual-Theme System & Styling

* **Light Mode (Warm Cream / Soft Ivory)**:
  * Application Background: `#faf8f5` (`cream-50`)
  * Panel & Card Surfaces: `#f5f3ee` (`cream-100`)
  * Borders & Dividers: `#e5e2da` (`cream-300`)
  * Typography: Deep charcoal `#1c2024` and `#555e6c`
* **Dark Mode (Technical Slate & Deep Void)**:
  * Application Background: `#090d16`
  * Card Surfaces: `#0f172a` and `#020617`
  * Borders: `#1e293b`
  * Typography: `#f8fafc` and `#94a3b8`
* **Anti-Flash Theme Hydration**:
  * An inline script in `app/layout.tsx` reads `localStorage` before paint to eliminate flash-of-unstyled-theme.
  * Theme is toggled via `components/theme/ThemeToggle.tsx` and synchronized through `components/theme/ThemeProvider.tsx`.
* **Vector Branding**:
  * Bespoke vector SVG brand mark in `components/brand/PatchPilotLogo.tsx`.
  * Favicon mark served via `app/icon.svg`.

---

## 📄 Application Pages & Current Status

The application contains 10 primary views. Following Phase 3, the data flow distinguishes between **live API-backed pages** and **interactive demonstration pages**:

### 1. Live API-Backed Pages (Phase 3 Implemented)

| Page Route | Data Source | Implemented Capabilities |
|---|---|---|
| **`/repositories`** | Live FastAPI (`GET /api/v1/repositories`) | * Lists connected repositories stored in PostgreSQL.<br>* Displays discrete **Open Issues** and **Open Pull Requests** count boxes.<br>* Renders `Synced from GitHub` data provenance indicator.<br>* Interactive `ConnectRepoModal` connecting to `POST /api/v1/repositories`.<br>* Responsive search and language filters.<br>* Dynamic states: Loading pulse skeleton, empty state prompt, live data, and offline banner with retry button. |
| **`/issues`** | Live FastAPI (`GET /api/v1/issues`) | * Lists synchronized GitHub issues stored in PostgreSQL.<br>* Displays issue numbers, titles, reporters, relative creation dates, and status pills.<br>* Tabs for `All Issues`, `Open`, and `Closed` with dynamic counters.<br>* Search filter across issue titles, numbers, and repository names.<br>* Pull Requests are strictly excluded from display.<br>* Dynamic states: Loading pulse skeleton, empty state prompt, live data, and offline banner with retry button. |

### 2. Demonstration & Workspace Pages (Phase 2 UI / Awaiting Phase 4+ AI Engine)

The following pages provide fully interactive Phase 2 design layouts displaying simulated data, prepared for live AI engine integration in Phase 4 and Phase 6:

| Page Route | Description | Current State |
|---|---|---|
| **`/` (Overview)** | Operational dashboard showing system metrics, active investigation pipeline (`#142`), recent activity stream, release gate preview, and backend health status badge (`/api/health`). | Live `/api/health` connectivity badge + Phase 2 interactive presentation data. |
| **`/issues/[id]`** | Deep investigation workspace showing root-cause hypothesis, Sentry stack trace, and agent diagnostic timeline for issue `#142`. | Phase 2 interactive mockup (AI analysis engine scheduled for Phase 4). |
| **`/agents`** | Multi-agent execution monitor showing 7 specialized agents (Orchestrator, Repo Intelligence, Patch, Test, Security, Sandbox, Release) with live-updating terminal logs (`AgentConsole`). | Phase 2 interactive mockup (autonomous agent orchestration scheduled for Phase 4). |
| **`/patches`** | Unified code diff viewer with syntax highlighting and review action controls (Accept Patch, Request Changes, Run Sandbox Tests). | Phase 2 interactive mockup (patch synthesis scheduled for Phase 4). |
| **`/tests`** | Automated regression sandbox pipeline displaying 5-step test execution, pass/fail status, and code coverage delta breakdown. | Phase 2 interactive mockup (test synthesis scheduled for Phase 4). |
| **`/security`** | Static security audit finding cards displaying CWE identifiers, vulnerable AST code paths, and proposed remediation diffs. | Phase 2 interactive mockup (security audit agent scheduled for Phase 4). |
| **`/releases`** | Release gate evaluation view assessing candidate `v2.4.1-patch1` across 5 automated quality gates and changelog review. | Phase 2 interactive mockup (release readiness scheduled for Phase 4). |
| **`/activity`** | Chronological audit stream recording agent actions, patch creations, test passes, and security checks. | Phase 2 interactive mockup. |
| **`/settings`** | Developer preferences for agent concurrency, sandbox isolation mode, and alert triggers. | Phase 2 interactive mockup. |

---

## 🔌 API Client Abstraction (`frontend/lib/api.ts`)

All network communication with the backend is centralized in `frontend/lib/api.ts`:

* `api.getRepositories()`: Calls `GET /api/v1/repositories`.
* `api.getRepository(id)`: Calls `GET /api/v1/repositories/{id}`.
* `api.connectRepository(owner, name)`: Calls `POST /api/v1/repositories`.
* `api.getIssues(repositoryId?, state?)`: Calls `GET /api/v1/issues`.
* `api.getIssue(id)`: Calls `GET /api/v1/issues/{id}`.
* `api.getRepositoryContents(id, path)`: Calls `GET /api/v1/repositories/{id}/contents`.
* `api.isBackendAvailable()`: Probes `GET /api/health` to detect service availability.

### Graceful Degradation & Offline Fallback
If the FastAPI backend is stopped or unreachable:
1. `isBackendAvailable()` detects that the service is offline.
2. The UI renders a non-intrusive warning banner informing the developer how to start the backend (`uvicorn app.main:app --port 8000`).
3. A "Retry" button allows one-click reconnection.
4. A "View sample demo data" toggle allows developers to explore the UI using local mock data without breaking the layout.

---

## 📁 Directory Structure

```text
frontend/
├── app/
│   ├── layout.tsx                # Root layout, theme script, sidebar shell
│   ├── page.tsx                  # / (Overview dashboard)
│   ├── globals.css               # Theme variables, scrollbars, utility classes
│   ├── icon.svg                  # Vector application favicon
│   ├── repositories/page.tsx     # /repositories (Live connected repositories)
│   ├── issues/page.tsx           # /issues (Live synchronized GitHub issues)
│   ├── issues/[id]/page.tsx      # /issues/[id] (Issue investigation workspace)
│   ├── agents/page.tsx           # /agents (Multi-agent console monitor)
│   ├── patches/page.tsx          # /patches (Unified diff review)
│   ├── tests/page.tsx            # /tests (Validation sandbox pipeline)
│   ├── security/page.tsx         # /security (AST vulnerability findings)
│   ├── releases/page.tsx         # /releases (Release gate evaluation)
│   ├── activity/page.tsx         # /activity (Audit trail)
│   └── settings/page.tsx         # /settings (System preferences)
│
├── components/
│   ├── brand/PatchPilotLogo.tsx  # Vector SVG brand symbol
│   ├── layout/Header.tsx         # Top navigation, search, theme toggle
│   ├── layout/Sidebar.tsx        # Navigation sidebar with route indicators
│   ├── repository/               # ConnectRepoModal and repository components
│   ├── theme/                    # ThemeProvider and ThemeToggle components
│   ├── ui/                       # Reusable Badges, Buttons, Cards
│   └── icons/                    # Bespoke featherweight SVG icons
│
├── lib/
│   └── api.ts                    # Typed API client functions
├── types/
│   ├── api.ts                    # Backend API response contract interfaces
│   └── domain.ts                 # Phase 2 domain entity types
├── data/
│   └── mockData.ts               # Sample presentation dataset
└── tailwind.config.ts            # Custom cream/charcoal color definitions
```

---

## 🚀 Development & Build

All dependencies are strictly project-local (`frontend/node_modules/`).

```powershell
cd d:\PatchPilot\frontend

# Install dependencies locally
npm install

# Verify production build and type checking (All 14 routes)
npm run build

# Start development server
npm run dev
```

* UI URL: `http://localhost:3000`
* API Proxy: Communicates with `http://localhost:8000` (configured via `NEXT_PUBLIC_API_URL`).
