"""Pydantic schemas for health and system status."""

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Basic health check response schema."""
    status: str = Field(default="ok", description="Operational status of the API")
    service: str = Field(default="patchpilot-api", description="Service identifier")
