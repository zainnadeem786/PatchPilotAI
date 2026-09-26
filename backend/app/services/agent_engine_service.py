"""Service orchestrating AI Agent Engine pipeline runs against tracked repositories and issues."""

import logging
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.issue import Issue
from app.models.repository import Repository
from app.services.repository_service import repository_service
from app.services.issue_service import issue_service
from app.services.github_service import github_service
from app.agents.types import (
    AgentContext,
    EngineResult,
    IssueContext,
    RepositoryContext,
    RepositoryFileEntry,
)
from app.agents.llm_client import llm_client
from app.agents.pipeline import AgentPipeline
from app.agents.orchestrator_agent import OrchestratorAgent
from app.agents.repository_intelligence_agent import RepositoryIntelligenceAgent
from app.agents.patch_synthesis_agent import PatchSynthesisAgent
from app.agents.regression_test_agent import RegressionTestSynthesisAgent
from app.agents.security_audit_agent import SecurityAuditAgent
from app.agents.release_agent import ReleaseAgent


logger = logging.getLogger(__name__)


class AgentEngineNotFoundError(Exception):
    """Raised when the issue or repository targeted for analysis does not exist."""
    pass


class AgentEngineService:
    """Builds `AgentContext` from persisted Phase 3 data and runs the agent pipeline.

    Agents never touch the database or GitHub directly; this service performs
    all of that up front and hands agents a fully-populated, read-only context.
    """

    def _build_pipeline(self) -> AgentPipeline:
        """Construct the six-stage pipeline with the shared `LLMClient` injected into each agent."""
        """Construct the five-stage pipeline with the shared `LLMClient` injected into each agent."""
        return AgentPipeline(
            [
                OrchestratorAgent(llm_client),
                RepositoryIntelligenceAgent(llm_client),
                PatchSynthesisAgent(llm_client),
                RegressionTestSynthesisAgent(llm_client),
                SecurityAuditAgent(llm_client),
                ReleaseAgent(llm_client),
            ]
        )

    async def analyze_issue(self, db: Session, issue_id: int) -> EngineResult:
        """Run the full agent pipeline for a single tracked issue and its repository.

        Raises:
            AgentEngineNotFoundError: If the issue or its repository does not exist.
        """
        issue = issue_service.get_issue(db, issue_id)
        if not issue:
            raise AgentEngineNotFoundError(f"Issue with ID {issue_id} was not found.")

        repo = repository_service.get_repository(db, issue.repository_id)
        if not repo:
            raise AgentEngineNotFoundError(f"Repository with ID {issue.repository_id} was not found.")

        context = await self._build_context(repo, issue)
        pipeline = self._build_pipeline()
        return await pipeline.run(context)

    async def _build_context(self, repo: Repository, issue: Optional[Issue]) -> AgentContext:
        """Assemble `AgentContext` from already-persisted repository/issue rows."""
        repository_context = RepositoryContext(
            id=repo.id,
            owner=repo.owner,
            name=repo.name,
            full_name=repo.full_name,
            default_branch=repo.default_branch,
            language=repo.language,
            html_url=repo.html_url,
            description=repo.description,
        )

        issue_context = None
        if issue is not None:
            issue_context = IssueContext(
                id=issue.id,
                number=issue.number,
                title=issue.title,
                body=issue.body,
                state=issue.state,
                author=issue.author,
                html_url=issue.html_url,
            )

        repository_files = await self._load_repository_files(repo)

        return AgentContext(
            repository=repository_context,
            issue=issue_context,
            repository_files=repository_files,
        )

    async def _load_repository_files(self, repo: Repository) -> List[RepositoryFileEntry]:
        """Best-effort top-level repository tree listing; analysis proceeds without it on failure."""
        try:
            contents = await github_service.get_repository_contents(repo.owner, repo.name)
        except Exception:
            logger.warning(
                "Repository file listing unavailable for '%s'; continuing without it.",
                repo.full_name,
            )
            return []

        if not isinstance(contents, list):
            return []

        return [
            RepositoryFileEntry(
                path=item.get("path", ""),
                type=item.get("type", "file"),
                size=item.get("size"),
            )
            for item in contents
            if isinstance(item, dict)
        ]


agent_engine_service = AgentEngineService()
