/** API contract definitions for PatchPilot */

export interface HealthResponse {
  status: string;
  service: string;
}

export type ConnectionState = "idle" | "loading" | "connected" | "unavailable";
