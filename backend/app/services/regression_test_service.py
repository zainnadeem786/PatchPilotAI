"""Database service for querying persisted Regression Test Synthesis Agent results."""

from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.regression_test import RegressionTest


class RegressionTestService:
    """Read-only service layer over persisted `RegressionTest` rows."""

    def list_tests(
        self,
        db: Session,
        repository_id: Optional[int] = None,
        issue_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[RegressionTest]:
        query = db.query(RegressionTest)
        if repository_id is not None:
            query = query.filter(RegressionTest.repository_id == repository_id)
        if issue_id is not None:
            query = query.filter(RegressionTest.issue_id == issue_id)
        return query.order_by(RegressionTest.created_at.desc()).offset(skip).limit(limit).all()

    def get_test(self, db: Session, test_id: int) -> Optional[RegressionTest]:
        return db.query(RegressionTest).filter(RegressionTest.id == test_id).first()


regression_test_service = RegressionTestService()
