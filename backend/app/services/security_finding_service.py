"""Database service for querying persisted Security Audit Agent findings."""

from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.security_finding import SecurityFinding


class SecurityFindingService:
    """Read-only service layer over persisted `SecurityFinding` rows."""

    def list_findings(
        self,
        db: Session,
        repository_id: Optional[int] = None,
        issue_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[SecurityFinding]:
        query = db.query(SecurityFinding)
        if repository_id is not None:
            query = query.filter(SecurityFinding.repository_id == repository_id)
        if issue_id is not None:
            query = query.filter(SecurityFinding.issue_id == issue_id)
        return query.order_by(SecurityFinding.created_at.desc()).offset(skip).limit(limit).all()

    def get_finding(self, db: Session, finding_id: int) -> Optional[SecurityFinding]:
        return db.query(SecurityFinding).filter(SecurityFinding.id == finding_id).first()


security_finding_service = SecurityFindingService()
