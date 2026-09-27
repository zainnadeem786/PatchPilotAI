"""SQLAlchemy model for a persisted Regression Test Synthesis Agent result."""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship
from app.db.base import Base


class RegressionTest(Base):
    """A single regression test artifact produced by the Regression Test Synthesis Agent.

    Generated only - `execution_status` defaults to "Generated — Not Executed"
    and is only ever changed to a passed/failed state by an actual CI test
    run outside of PatchPilot; PatchPilot itself never executes generated code.
    """

    __tablename__ = "regression_tests"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    analysis_run_id = Column(
        Integer, ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id", ondelete="CASCADE"), nullable=True, index=True)

    mode = Column(String(20), nullable=False)  # "static" | "llm"
    status = Column(String(30), nullable=False, default="Generated")  # Generated | Not Generated
    execution_status = Column(String(40), nullable=False, default="Generated — Not Executed")
    review_status = Column(String(30), nullable=False, default="Pending Review")

    test_file = Column(String(512), nullable=True)
    purpose = Column(Text, nullable=True)
    reproduction_scenario = Column(Text, nullable=True)
    expected_behavior = Column(Text, nullable=True)
    test_code = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    analysis_run = relationship("AnalysisRun", back_populates="regression_tests")
    repository = relationship("Repository")
    issue = relationship("Issue")

    def __repr__(self) -> str:
        return f"<RegressionTest(id={self.id}, issue_id={self.issue_id}, status='{self.status}')>"
