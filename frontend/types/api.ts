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
}

// ── Agent registry (GET /api/v1/agents) ──────────────────────────────────────

export interface AgentRegistryEntry {
  name: string;
  display_name: string;
  role: string;
  description: string;
}
