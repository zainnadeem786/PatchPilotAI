"""Database service for querying persisted Patch Synthesis Agent results."""

from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.patch import Patch


class PatchService:
    """Read-only service layer over persisted `Patch` rows (written by `analysis_persistence_service`)."""

    def list_patches(
        self,
        db: Session,
        repository_id: Optional[int] = None,
        issue_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Patch]:
        query = db.query(Patch)
        if repository_id is not None:
            query = query.filter(Patch.repository_id == repository_id)
        if issue_id is not None:
            query = query.filter(Patch.issue_id == issue_id)
        return query.order_by(Patch.created_at.desc()).offset(skip).limit(limit).all()

    def get_patch(self, db: Session, patch_id: int) -> Optional[Patch]:
        return db.query(Patch).filter(Patch.id == patch_id).first()


patch_service = PatchService()
