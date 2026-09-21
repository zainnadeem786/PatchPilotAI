/** API client abstraction for PatchPilot */

import { HealthResponse } from "@/types/api";

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
      headers: {
        Accept: "application/json",
      },
      // Cache: no-store ensures fresh checks
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Backend health check failed with HTTP ${response.status}: ${response.statusText}`
      );
    }

    return response.json();
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

export const api = new ApiClient();
