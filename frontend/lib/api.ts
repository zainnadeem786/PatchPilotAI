/** API client abstraction for PatchPilot */

import {
  HealthResponse,
  BackendRepository,
  BackendIssue,
  BackendContentItem,
  EngineResultResponse,
  AgentRegistryEntry,
} from "@/types/api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "http://localhost:8000";

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch backend operational health status.
   * Calls GET /api/health
   */
  async checkHealth(): Promise<HealthResponse> {
    const url = `${this.baseUrl}/api/health`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Backend health check failed with HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Safe check whether the backend is online without throwing unhandled exceptions.
   */
  async isBackendAvailable(): Promise<boolean> {
    try {
      await this.checkHealth();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all tracked repositories.
   * Calls GET /api/v1/repositories
   */
  async getRepositories(): Promise<BackendRepository[]> {
    const url = `${this.baseUrl}/api/v1/repositories`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to load repositories (HTTP ${response.status}): ${errorBody}`);
    }

    return response.json();
  }

  /**
   * Retrieve a specific repository by ID.
   * Calls GET /api/v1/repositories/{id}
   */
  async getRepository(id: number | string): Promise<BackendRepository> {
    const url = `${this.baseUrl}/api/v1/repositories/${id}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Repository #${id} not found or failed (HTTP ${response.status})`);
    }

    return response.json();
  }

  /**
   * Connect a new GitHub repository to PatchPilot.
   * Calls POST /api/v1/repositories
   */
  async connectRepository(owner: string, name: string): Promise<BackendRepository> {
    const url = `${this.baseUrl}/api/v1/repositories`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ owner, name }),
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const errorJson = await response.json();
        detail = errorJson.detail || detail;
      } catch {
        detail = await response.text() || detail;
      }
      throw new Error(detail);
    }

    return response.json();
  }

  /**
   * List all issues or filter by repository and state.
   * Calls GET /api/v1/issues
   */
  async getIssues(
    repositoryId?: number | string,
    state?: string,
  ): Promise<BackendIssue[]> {
    const params = new URLSearchParams();
    if (repositoryId !== undefined && repositoryId !== null) {
      params.append("repository_id", String(repositoryId));
    }
    if (state) {
      params.append("state", state);
    }

    const queryStr = params.toString() ? `?${params.toString()}` : "";
    const url = `${this.baseUrl}/api/v1/issues${queryStr}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to load issues (HTTP ${response.status})`);
    }

    return response.json();
  }

  /**
   * Retrieve a specific issue by ID.
   * Calls GET /api/v1/issues/{id}
   */
  async getIssue(id: number | string): Promise<BackendIssue> {
    const url = `${this.baseUrl}/api/v1/issues/${id}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Issue #${id} not found (HTTP ${response.status})`);
    }

    return response.json();
  }

  /**
   * Browse repository directory contents.
   * Calls GET /api/v1/repositories/{id}/contents
   */
  async getRepositoryContents(
    repositoryId: number | string,
    path: string = "",
  ): Promise<BackendContentItem[]> {
    const param = path ? `?path=${encodeURIComponent(path)}` : "";
    const url = `${this.baseUrl}/api/v1/repositories/${repositoryId}/contents${param}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to load contents (HTTP ${response.status})`);
    }

    return response.json();
  }

  /**
   * Retrieve the canonical ordered list of registered pipeline agents.
   * Calls GET /api/v1/agents
   * This is the single source of truth for agent count and metadata.
   */
  async getAgents(): Promise<AgentRegistryEntry[]> {
    const url = `${this.baseUrl}/api/v1/agents`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to load agent registry (HTTP ${response.status})`);
    }

    return response.json();
  }

  /**
   * Run the Phase 4/5 AI Agent Engine pipeline for a tracked issue.
   * Calls POST /api/v1/issues/{id}/analyze
   */
  async analyzeIssue(id: number | string): Promise<EngineResultResponse> {
    const url = `${this.baseUrl}/api/v1/issues/${id}/analyze`;
    const response = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const errorJson = await response.json();
        detail = errorJson.detail || detail;
      } catch {
        detail = (await response.text()) || detail;
      }
      throw new Error(detail);
    }

    return response.json();
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

export const api = new ApiClient();
