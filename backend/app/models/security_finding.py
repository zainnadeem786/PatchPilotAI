"""SQLAlchemy model for a persisted Security Audit Agent finding."""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship
from app.db.base import Base


class SecurityFinding(Base):
    """A single finding produced by the Security Audit Agent for one analysis run.

    `blocking` mirrors the deterministic release-gate rule (high/critical
    severity blocks release) and is never set from LLM narrative text alone.
    """

    __tablename__ = "security_findings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    analysis_run_id = Column(
        Integer, ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id", ondelete="CASCADE"), nullable=True, index=True)

    mode = Column(String(20), nullable=False)  # "static" | "llm"
    severity = Column(String(20), nullable=False, default="info")
    title = Column(String(512), nullable=False)
    detail = Column(Text, nullable=True)
    affected_area = Column(String(512), nullable=True)
    blocking = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    analysis_run = relationship("AnalysisRun", back_populates="security_findings")
    repository = relationship("Repository")
    issue = relationship("Issue")

    def __repr__(self) -> str:
        return f"<SecurityFinding(id={self.id}, severity='{self.severity}', blocking={self.blocking})>"
