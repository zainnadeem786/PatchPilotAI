"""SQLAlchemy model for an isolated patch and regression test validation run (Phase 7)."""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship
from app.db.base import Base


class ValidationRun(Base):
    """Persisted execution record of an isolated patch validation run.

    Executed inside a non-privileged, ephemeral Docker container with network=none
    and strict resource limits. Never executed directly on the host API server.
    """

    __tablename__ = "validation_runs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    analysis_run_id = Column(
        Integer, ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    repository_id = Column(
        Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True
    )
    issue_id = Column(
        Integer, ForeignKey("issues.id", ondelete="CASCADE"), nullable=True, index=True
    )

    status = Column(
        String(40), nullable=False, default="validation_unavailable"
    )  # "passed" | "failed" | "timeout" | "validation_unavailable" | "setup_failed"
    tests_run = Column(Boolean, nullable=False, default=False)
    exit_code = Column(Integer, nullable=True)
    stdout = Column(Text, nullable=True)
    stderr = Column(Text, nullable=True)
    duration_ms = Column(Integer, nullable=False, default=0)
    summary = Column(Text, nullable=True)
    failure_reason = Column(Text, nullable=True)
    executed_command = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    analysis_run = relationship("AnalysisRun", back_populates="validation_runs")
    repository = relationship("Repository")
    issue = relationship("Issue")

    def __repr__(self) -> str:
        return (
            f"<ValidationRun(id={self.id}, analysis_run_id={self.analysis_run_id}, "
            f"status='{self.status}', exit_code={self.exit_code})>"
        )
