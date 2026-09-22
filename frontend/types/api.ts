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
