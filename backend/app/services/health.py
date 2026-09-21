"""Health service business logic."""

from app.schemas.health import HealthResponse


class HealthService:
    """Service handling health verification and system status checks."""

    @staticmethod
    def get_health_status() -> HealthResponse:
        """Return the basic system health status."""
        return HealthResponse(
            status="ok",
            service="patchpilot-api",
        )
