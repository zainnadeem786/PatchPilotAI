"""SQLAlchemy model for repository issues."""

from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    String,
    Text,
    DateTime,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship
from app.db.base import Base


class Issue(Base):
    """Database model representing a repository issue or ticket."""

    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    repository_id = Column(
        Integer,
        ForeignKey("repositories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    github_issue_id = Column(BigInteger, nullable=True, index=True)
    number = Column(Integer, nullable=False, index=True)
    title = Column(String(512), nullable=False)
    body = Column(Text, nullable=True)
    state = Column(String(50), nullable=False, default="open")
    html_url = Column(String(1024), nullable=True)
    author = Column(String(255), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # N-to-1 relationship back to Repository
    repository = relationship("Repository", back_populates="issues")

    def __repr__(self) -> str:
        return f"<Issue(id={self.id}, repo_id={self.repository_id}, #{self.number}: '{self.title[:30]}')>"
