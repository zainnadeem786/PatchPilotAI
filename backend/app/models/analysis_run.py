"""SQLAlchemy model for a single AI Agent Engine pipeline execution."""

from sqlalchemy import (
    Column,
    Integer,
    String,
    JSON,
    DateTime,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship
from app.db.base import Base


class AnalysisRun(Base):
    """Persisted record of one full agent-pipeline execution against an issue.

    Parent row for the per-agent artifacts (Patch, RegressionTest,
    SecurityFinding, ReleaseReadiness) produced by a single pipeline run, per
    the Phase 6 persistence model:
      Repository -> Issue -> AnalysisRun -> {Patch, RegressionTest,
      SecurityFinding, ReleaseReadiness}
    """

    __tablename__ = "analysis_runs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    repository_id = Column(
        Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True
    )
    issue_id = Column(
        Integer, ForeignKey("issues.id", ondelete="CASCADE"), nullable=True, index=True
    )
    status = Column(String(50), nullable=False, default="completed")
    roadmap = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    repository = relationship("Repository")
    issue = relationship("Issue")
    patches = relationship("Patch", back_populates="analysis_run", cascade="all, delete-orphan")
    regression_tests = relationship("RegressionTest", back_populates="analysis_run", cascade="all, delete-orphan")
    security_findings = relationship("SecurityFinding", back_populates="analysis_run", cascade="all, delete-orphan")
    release_readiness = relationship(
        "ReleaseReadiness", back_populates="analysis_run", cascade="all, delete-orphan", uselist=False
    )

    def __repr__(self) -> str:
        return f"<AnalysisRun(id={self.id}, repository_id={self.repository_id}, issue_id={self.issue_id})>"
