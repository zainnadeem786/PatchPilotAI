"""Database service for querying persisted Release Agent readiness evaluations."""

from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.release_readiness import ReleaseReadiness


class ReleaseReadinessService:
    """Read-only service layer over persisted `ReleaseReadiness` rows."""

    def list_releases(
        self,
        db: Session,
        repository_id: Optional[int] = None,
        issue_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[ReleaseReadiness]:
        query = db.query(ReleaseReadiness)
        if repository_id is not None:
            query = query.filter(ReleaseReadiness.repository_id == repository_id)
        if issue_id is not None:
            query = query.filter(ReleaseReadiness.issue_id == issue_id)
        return query.order_by(ReleaseReadiness.created_at.desc()).offset(skip).limit(limit).all()

    def get_release(self, db: Session, release_id: int) -> Optional[ReleaseReadiness]:
        return db.query(ReleaseReadiness).filter(ReleaseReadiness.id == release_id).first()


release_readiness_service = ReleaseReadinessService()
