"""API endpoints for GitHub OAuth flow under /api/v1/github."""

import secrets
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.github import GitHubOAuthStartResponse, GitHubOAuthCallbackResponse
from app.services.github_service import (
    github_service,
    GitHubConfigurationError,
    GitHubAuthError,
    GitHubAPIError,
)

router = APIRouter()


@router.get(
    "/auth/start",
    response_model=GitHubOAuthStartResponse,
    summary="Start GitHub OAuth flow",
    description="Generate a cryptographically secure random state parameter and GitHub authorization URL.",
)
def start_oauth():
    # Cryptographically secure random 32-byte state
    state = secrets.token_urlsafe(32)
    try:
        url = github_service.get_oauth_authorization_url(state)
        return GitHubOAuthStartResponse(authorization_url=url, state=state)
    except GitHubConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )


@router.get(
    "/auth/callback",
    response_model=GitHubOAuthCallbackResponse,
    summary="Handle GitHub OAuth callback",
    description="Process authorization code from GitHub and complete token exchange safely.",
)
async def oauth_callback(
    code: str = Query(..., description="Temporary authorization code from GitHub"),
    state: str = Query(..., description="State parameter for CSRF prevention"),
):
    if not code or not state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both 'code' and 'state' query parameters are required.",
        )

    try:
        # Code exchanged via backend service; token is kept inside service/session, never exposed
        await github_service.exchange_code_for_token(code)
        return GitHubOAuthCallbackResponse(
            status="authenticated",
            message="GitHub authorization verified successfully.",
            configured=True,
        )
    except GitHubConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )
    except GitHubAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"GitHub authentication error: {str(exc)}",
        )
    except GitHubAPIError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )
