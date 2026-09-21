"""API endpoints for repository operations under /api/v1/repositories."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.repository import RepositoryConnectRequest, RepositoryResponse
from app.schemas.issue import IssueResponse
from app.services.repository_service import repository_service
from app.services.issue_service import issue_service
from app.services.github_service import (
    github_service,
    GitHubNotFoundError,
    GitHubAuthError,
    GitHubRateLimitError,
    GitHubConfigurationError,
    GitHubValidationError,
    GitHubAPIError,
)

router = APIRouter()


@router.get(
    "",
    response_model=List[RepositoryResponse],
    summary="List tracked repositories",
    description="Retrieve all code repositories currently connected and tracked by PatchPilot.",
)
def list_repositories(
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of repositories to return"),
    db: Session = Depends(get_db),
):
    return repository_service.list_repositories(db, skip=skip, limit=limit)


@router.post(
    "",
    response_model=RepositoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Connect a new repository",
    description="Fetch repository metadata from GitHub and register it in PatchPilot PostgreSQL storage.",
)
async def connect_repository(
    payload: RepositoryConnectRequest,
    db: Session = Depends(get_db),
):
    # 1. Fetch metadata from GitHub service
    try:
        github_data = await github_service.get_repository(payload.owner, payload.name)
    except GitHubValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    except GitHubNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    except GitHubRateLimitError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(exc),
        )
    except GitHubAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        )
    except GitHubConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )
    except GitHubAPIError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )

    # 2. Calculate separated open issues vs open pull requests counts
    try:
        combined_count = int(github_data.get("open_issues_count", 0))
        open_issues_count, open_pull_requests_count = await github_service.get_repository_counts(
            payload.owner,
            payload.name,
            combined_count=combined_count,
        )
        github_data["open_issues_count"] = open_issues_count
        github_data["open_pull_requests_count"] = open_pull_requests_count
    except Exception:
        github_data["open_pull_requests_count"] = int(github_data.get("open_pull_requests_count", 0))

    # 3. Persist in database
    repo = repository_service.create_or_sync_repository(db, github_data)

    # 4. Synchronize open issues if available (safely guarded against secondary failures)
    try:
        issues_data = await github_service.list_repository_issues(payload.owner, payload.name)
        if issues_data:
            issue_service.sync_issues_for_repository(db, repo.id, issues_data)
    except Exception:
        # Repository registration succeeded; issues sync failure does not abort repo creation
        pass

    return repo


@router.get(
    "/{repository_id}",
    response_model=RepositoryResponse,
    summary="Get repository details",
    description="Retrieve a specific tracked repository by its database ID.",
)
def get_repository(
    repository_id: int,
    db: Session = Depends(get_db),
):
    repo = repository_service.get_repository(db, repository_id)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository with ID {repository_id} was not found.",
        )
    return repo


@router.get(
    "/{repository_id}/issues",
    response_model=List[IssueResponse],
    summary="List issues for a repository",
    description="Retrieve all tracked issues for a specific repository.",
)
def list_repository_issues(
    repository_id: int,
    db: Session = Depends(get_db),
):
    repo = repository_service.get_repository(db, repository_id)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository with ID {repository_id} was not found.",
        )
    return issue_service.list_issues(db, repository_id=repository_id)


@router.get(
    "/{repository_id}/contents",
    summary="Browse repository contents",
    description="Browse files and directories in the repository tree via GitHub API.",
)
async def get_repository_contents(
    repository_id: int,
    path: str = Query("", description="Relative path in repository tree"),
    db: Session = Depends(get_db),
):
    repo = repository_service.get_repository(db, repository_id)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository with ID {repository_id} was not found.",
        )

    try:
        contents = await github_service.get_repository_contents(repo.owner, repo.name, path=path)
        return contents
    except GitHubValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    except GitHubNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    except GitHubRateLimitError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(exc),
        )
    except GitHubAPIError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )
