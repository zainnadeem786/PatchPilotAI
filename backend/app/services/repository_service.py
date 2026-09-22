"""Database service for repository persistence and querying."""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.repository import Repository


class RepositoryService:
    """Service layer managing database operations for repositories."""

    def list_repositories(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Repository]:
        """List all tracked repositories ordered by most recently updated."""
        return (
            db.query(Repository)
            .order_by(Repository.updated_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_repository(
        self,
        db: Session,
        repo_id: int,
    ) -> Optional[Repository]:
        """Retrieve repository by primary key ID."""
        return db.query(Repository).filter(Repository.id == repo_id).first()

    def get_repository_by_full_name(
        self,
        db: Session,
        full_name: str,
    ) -> Optional[Repository]:
        """Retrieve repository by full_name ('owner/repo')."""
        return db.query(Repository).filter(Repository.full_name == full_name).first()

    def get_repository_by_github_id(
        self,
        db: Session,
        github_id: int,
    ) -> Optional[Repository]:
        """Retrieve repository by GitHub numeric repository ID."""
        return db.query(Repository).filter(Repository.github_id == github_id).first()

    def create_or_sync_repository(
        self,
        db: Session,
        github_data: Dict[str, Any],
    ) -> Repository:
        """Create or update a repository record from GitHub API metadata."""
        github_id = github_data["id"]
        owner = github_data["owner"]["login"] if isinstance(github_data.get("owner"), dict) else github_data.get("owner", "")
        name = github_data["name"]
        full_name = github_data.get("full_name") or f"{owner}/{name}"

        repo = self.get_repository_by_github_id(db, github_id)

        if not repo:
            repo = Repository(
                github_id=github_id,
                owner=owner,
                name=name,
                full_name=full_name,
                description=github_data.get("description"),
                default_branch=github_data.get("default_branch", "main"),
                private=bool(github_data.get("private", False)),
                html_url=github_data.get("html_url", f"https://github.com/{full_name}"),
                language=github_data.get("language"),
                open_issues_count=int(github_data.get("open_issues_count", 0)),
                open_pull_requests_count=int(github_data.get("open_pull_requests_count", 0)),
            )
            db.add(repo)
        else:
            # Update cached metadata
            repo.owner = owner
            repo.name = name
            repo.full_name = full_name
            repo.description = github_data.get("description")
            repo.default_branch = github_data.get("default_branch", "main")
            repo.private = bool(github_data.get("private", False))
            repo.html_url = github_data.get("html_url", repo.html_url)
            repo.language = github_data.get("language")
            repo.open_issues_count = int(github_data.get("open_issues_count", repo.open_issues_count))
            repo.open_pull_requests_count = int(github_data.get("open_pull_requests_count", repo.open_pull_requests_count))

        db.commit()
        db.refresh(repo)
        return repo

    def delete_repository(
        self,
        db: Session,
        repo_id: int,
    ) -> bool:
        """Delete a tracked repository and all cascaded issues."""
        repo = self.get_repository(db, repo_id)
        if not repo:
            return False
        db.delete(repo)
        db.commit()
        return True


repository_service = RepositoryService()
