"""SQLAlchemy model for a persisted Patch Synthesis Agent result."""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    JSON,
    DateTime,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship
from app.db.base import Base


class Patch(Base):
    """A single patch proposal produced by the Patch Synthesis Agent.

    Never applied, committed, or executed automatically - `review_status`
    always starts at "Pending Review" and release readiness always requires
    separate human approval regardless of this row's contents.
    """

    __tablename__ = "patches"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    analysis_run_id = Column(
        Integer, ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id", ondelete="CASCADE"), nullable=True, index=True)

    mode = Column(String(20), nullable=False)  # "static" | "llm"
    status = Column(String(30), nullable=False, default="Generated")  # Draft/Generated/Needs Review/Approved/Rejected
    review_status = Column(String(30), nullable=False, default="Pending Review")

    summary = Column(Text, nullable=True)
    files_changed = Column(JSON, nullable=False, default=list)
    unified_diff = Column(Text, nullable=True)
    reasoning = Column(Text, nullable=True)
    risks = Column(JSON, nullable=True, default=list)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    analysis_run = relationship("AnalysisRun", back_populates="patches")
    repository = relationship("Repository")
    issue = relationship("Issue")

    def __repr__(self) -> str:
        return f"<Patch(id={self.id}, issue_id={self.issue_id}, status='{self.status}')>"
