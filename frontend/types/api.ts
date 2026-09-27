/** API contract definitions for PatchPilot */

export interface HealthResponse {
  status: string;
  service: string;
}

export type ConnectionState = "idle" | "loading" | "connected" | "unavailable";

export interface BackendRepository {
  id: number;
  github_id: number;
  owner: string;
  name: string;
  full_name: string;
  description?: string | null;
  default_branch: string;
  private: boolean;
  html_url: string;
  language?: string | null;
  open_issues_count: number;
  open_pull_requests_count?: number;
  created_at: string;
  updated_at: string;
}

export interface BackendIssue {
  id: number;
  repository_id: number;
  github_issue_id?: number | null;
  number: number;
  title: string;
  body?: string | null;
  state: string;
  html_url?: string | null;
  author?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedIssueResponse {
  items: BackendIssue[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface BackendContentItem {

  name: string;
  path: string;
  type: string;
  size?: number | null;
  sha?: string | null;
  download_url?: string | null;
}

// ── Phase 4 / Phase 5 Agent Engine response types ────────────────────────────

export interface AgentFindingResponse {
  title: string;
  detail: string;
  severity: string;
  category?: string | null;
  file_path?: string | null;
}

export interface AgentResultResponse {
  agent_name: string;
  /** "success" | "error" */
  status: string;
  /** "static" | "llm" */
  mode: string;
  summary: string;
  findings: AgentFindingResponse[];
  /**
   * Typed data bag. ReleaseAgent adds:
   *   release_ready: boolean
   *   status: "human_review_required" | "blocked"
   *   blocking_reasons: string[]
   *   warnings: string[]
   */
  data: Record<string, unknown>;
  error?: string | null;
}

export interface EngineResultResponse {
  repository_id: number;
  issue_id?: number | null;
  results: AgentResultResponse[];
  roadmap: string[];
  validation?: ValidationRunResponse | null;
}

// ── Agent registry (GET /api/v1/agents) ──────────────────────────────────────

export interface AgentRegistryEntry {
  name: string;
  display_name: string;
  role: string;
  description: string;
}

// ── Phase 6 — Persisted agent-artifact response types ───────────────────────
// One row per analysis run, written by the backend's analysis_persistence_service
// immediately after POST /issues/{id}/analyze completes.

export interface PatchResponse {
  id: number;
  analysis_run_id: number;
  repository_id: number;
  issue_id?: number | null;
  repository_full_name?: string | null;
  issue_number?: number | null;
  issue_title?: string | null;
  /** "static" | "llm" */
  mode: string;
  /** Draft | Generated | Needs Review | Approved | Rejected */
  status: string;
  review_status: string;
  summary?: string | null;
  files_changed: string[];
  unified_diff?: string | null;
  reasoning?: string | null;
  risks: string[];
  created_at: string;
}

export interface RegressionTestResponse {
  id: number;
  analysis_run_id: number;
  repository_id: number;
  issue_id?: number | null;
  repository_full_name?: string | null;
  issue_number?: number | null;
  issue_title?: string | null;
  mode: string;
  /** Generated | Not Generated */
  status: string;
  /** e.g. "Generated — Not Executed" */
  execution_status: string;
  review_status: string;
  test_file?: string | null;
  purpose?: string | null;
  reproduction_scenario?: string | null;
  expected_behavior?: string | null;
  test_code?: string | null;
  created_at: string;
}

export interface SecurityFindingResponse {
  id: number;
  analysis_run_id: number;
  repository_id: number;
  issue_id?: number | null;
  repository_full_name?: string | null;
  issue_number?: number | null;
  issue_title?: string | null;
  mode: string;
  severity: string;
  title: string;
  detail?: string | null;
  affected_area?: string | null;
  blocking: boolean;
  created_at: string;
}

export interface ReleaseReadinessResponse {
  id: number;
  analysis_run_id: number;
  repository_id: number;
  issue_id?: number | null;
  repository_full_name?: string | null;
  issue_number?: number | null;
  issue_title?: string | null;
  mode: string;
  release_ready: boolean;
  /** human_review_required | blocked */
  status: string;
  blocking_reasons: string[];
  warnings: string[];
  gate_checks: Array<{ title: string; detail: string; severity: string; category?: string | null }>;
  human_approval_required: boolean;
  created_at: string;
}

export interface ValidationRunResponse {
  id?: number | null;
  analysis_run_id: number;
  repository_id: number;
  issue_id?: number | null;
  /** "passed" | "failed" | "timeout" | "validation_unavailable" | "setup_failed" */
  status: string;
  tests_run: boolean;
  exit_code?: number | null;
  stdout?: string | null;
  stderr?: string | null;
  duration_ms: number;
  summary?: string | null;
  failure_reason?: string | null;
  executed_command?: string | null;
  created_at?: string | null;
}
