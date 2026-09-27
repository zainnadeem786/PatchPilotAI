"""SQLAlchemy model for a persisted Release Agent readiness evaluation."""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    JSON,
    DateTime,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship
from app.db.base import Base


class ReleaseReadiness(Base):
    """Release-readiness evaluation for a single analysis run.

    `human_approval_required` is always True — PatchPilot never commits,
    pushes, merges, or deploys automatically, regardless of `release_ready`.
    """

    __tablename__ = "release_readiness"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    analysis_run_id = Column(
        Integer, ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id", ondelete="CASCADE"), nullable=True, index=True)

    mode = Column(String(20), nullable=False)  # "static" | "llm"
    release_ready = Column(Boolean, nullable=False, default=False)
    status = Column(String(30), nullable=False, default="blocked")  # human_review_required | blocked
    blocking_reasons = Column(JSON, nullable=False, default=list)
    warnings = Column(JSON, nullable=False, default=list)
    gate_checks = Column(JSON, nullable=False, default=list)
    human_approval_required = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    analysis_run = relationship("AnalysisRun", back_populates="release_readiness")
    repository = relationship("Repository")
    issue = relationship("Issue")

    def __repr__(self) -> str:
        return f"<ReleaseReadiness(id={self.id}, release_ready={self.release_ready}, status='{self.status}')>"
