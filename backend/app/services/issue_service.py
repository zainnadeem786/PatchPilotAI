"""Database service for issue persistence and querying."""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.issue import Issue


class IssueService:
    """Service layer managing database operations for repository issues."""

    def list_issues(
        self,
        db: Session,
        repository_id: Optional[int] = None,
        state: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Issue]:
        """List issues with optional repository_id and state filtering."""
        query = db.query(Issue)

        if repository_id is not None:
            query = query.filter(Issue.repository_id == repository_id)

        if state is not None:
            query = query.filter(Issue.state == state)

        return query.order_by(Issue.number.desc()).offset(skip).limit(limit).all()

    def get_issue(
        self,
        db: Session,
        issue_id: int,
    ) -> Optional[Issue]:
        """Retrieve issue by primary key ID."""
        return db.query(Issue).filter(Issue.id == issue_id).first()

    def get_issue_by_number(
        self,
        db: Session,
        repository_id: int,
        number: int,
    ) -> Optional[Issue]:
        """Retrieve issue by repository ID and issue number."""
        return (
            db.query(Issue)
            .filter(
                Issue.repository_id == repository_id,
                Issue.number == number,
            )
            .first()
        )

    def sync_issues_for_repository(
        self,
        db: Session,
        repository_id: int,
        github_issues: List[Dict[str, Any]],
    ) -> List[Issue]:
        """Upsert issues retrieved from GitHub API for a given repository."""
        synced_issues: List[Issue] = []

        for item in github_issues:
            # Strictly exclude Pull Requests (GitHub includes 'pull_request' key on PRs)
            if "pull_request" in item:
                continue

            number = item["number"]
            github_issue_id = item.get("id")
            title = item.get("title", "")
            body = item.get("body")
            state = item.get("state", "open")
            html_url = item.get("html_url")
            author = item["user"]["login"] if isinstance(item.get("user"), dict) else item.get("user")

            issue = self.get_issue_by_number(db, repository_id, number)

            if not issue:
                issue = Issue(
                    repository_id=repository_id,
                    github_issue_id=github_issue_id,
                    number=number,
                    title=title,
                    body=body,
                    state=state,
                    html_url=html_url,
                    author=author,
                )
                db.add(issue)
            else:
                issue.github_issue_id = github_issue_id
                issue.title = title
                issue.body = body
                issue.state = state
                issue.html_url = html_url
                issue.author = author

            synced_issues.append(issue)

        db.commit()
        for iss in synced_issues:
            db.refresh(iss)

        return synced_issues


issue_service = IssueService()
