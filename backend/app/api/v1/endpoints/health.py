"""Health endpoint routes."""

from fastapi import APIRouter, status
from app.schemas.health import HealthResponse
from app.services.health import HealthService

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Health check endpoint",
    description="Returns the operational health status of the PatchPilot API.",
)
def get_health() -> HealthResponse:
    """Check API operational health status."""
    return HealthService.get_health_status()
