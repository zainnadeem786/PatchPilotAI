"""SQLAlchemy model for tracked repositories."""

from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    String,
    Text,
    Boolean,
    DateTime,
    func,
)
from sqlalchemy.orm import relationship
from app.db.base import Base


class Repository(Base):
    """Database model representing a tracked code repository."""

    __tablename__ = "repositories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    github_id = Column(BigInteger, unique=True, index=True, nullable=False)
    owner = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    full_name = Column(String(512), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    default_branch = Column(String(100), nullable=False, default="main")
    private = Column(Boolean, nullable=False, default=False)
    html_url = Column(String(1024), nullable=False)
    language = Column(String(100), nullable=True)
    open_issues_count = Column(Integer, nullable=False, default=0)
    open_pull_requests_count = Column(Integer, nullable=False, default=0)
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

    # 1-to-N relationship with issues
    issues = relationship(
        "Issue",
        back_populates="repository",
        cascade="all, delete-orphan",
        order_by="desc(Issue.number)",
    )

    def __repr__(self) -> str:
        return f"<Repository(id={self.id}, full_name='{self.full_name}')>"
