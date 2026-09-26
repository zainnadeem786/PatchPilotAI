"""Service orchestrating AI Agent Engine pipeline runs against tracked repositories and issues."""

import base64
import logging
import re
from typing import Dict, List, Optional
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
from app.services.analysis_persistence_service import persist_engine_result
from app.agents.orchestrator_agent import OrchestratorAgent
from app.agents.repository_intelligence_agent import RepositoryIntelligenceAgent
from app.agents.patch_synthesis_agent import PatchSynthesisAgent
from app.agents.regression_test_agent import RegressionTestSynthesisAgent
from app.agents.security_audit_agent import SecurityAuditAgent
from app.agents.release_agent import ReleaseAgent


logger = logging.getLogger(__name__)

# ── Phase 6 Part 3: bounded repository context — hard limits ─────────────────
# Cap the number of files whose source is sent to the LLM, and how much of
# each file, so a single analysis run cannot balloon token usage. Filenames
# matching _SECRET_FILENAME_PATTERN are never fetched, regardless of extension.
_MAX_SNIPPET_FILES = 5
_MAX_SNIPPET_CHARS = 2000
_SOURCE_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".go", ".rs", ".java", ".rb",
    ".php", ".c", ".cpp", ".h", ".hpp", ".cs", ".kt", ".swift",
}
_SECRET_FILENAME_PATTERN = re.compile(
    r"(^|/)(\.env(\..*)?|.*\.pem|.*\.key|id_rsa\w*|.*secret.*|.*credential.*|.*password.*|"
    r"\.npmrc|\.pypirc|.*\.pfx|.*\.p12)$",
    re.IGNORECASE,
)


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
        engine_result = await pipeline.run(context)

        # Phase 6: persist this run so the Patches/Tests/Security/Releases
        # pages have a durable data source. Persistence failures are logged
        # and never hide the (already-computed) analysis result from the caller.
        try:
            persist_engine_result(db, repo.id, issue.id if issue else None, engine_result)
        except Exception:
            db.rollback()
            logger.exception("Failed to persist analysis run for issue_id=%s", issue.id if issue else None)

        return engine_result

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
        repository_snippets = await self._load_repository_snippets(repo, repository_files)

        return AgentContext(
            repository=repository_context,
            issue=issue_context,
            repository_files=repository_files,
            repository_snippets=repository_snippets,
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

    async def _load_repository_snippets(
        self, repo: Repository, repository_files: List[RepositoryFileEntry]
    ) -> Dict[str, str]:
        """Best-effort, hard-bounded source snippets for a small subset of top-level files.

        Never fetches `.env`, key/credential/secret-like files (see
        `_SECRET_FILENAME_PATTERN`), caps the number of files fetched
        (`_MAX_SNIPPET_FILES`) and truncates each to `_MAX_SNIPPET_CHARS`
        characters. Best-effort: any failure just yields fewer snippets, it
        never aborts the analysis.
        """
        candidates = [
            entry
            for entry in repository_files
            if entry.type == "file"
            and any(entry.path.lower().endswith(ext) for ext in _SOURCE_EXTENSIONS)
            and not _SECRET_FILENAME_PATTERN.search(entry.path)
        ][:_MAX_SNIPPET_FILES]

        snippets: Dict[str, str] = {}
        for entry in candidates:
            try:
                file_data = await github_service.get_repository_contents(repo.owner, repo.name, path=entry.path)
            except Exception:
                continue

            if not isinstance(file_data, dict) or file_data.get("encoding") != "base64":
                continue

            try:
                raw = base64.b64decode(file_data.get("content", "")).decode("utf-8", errors="replace")
            except Exception:
                continue

            snippets[entry.path] = raw[:_MAX_SNIPPET_CHARS]

        return snippets


agent_engine_service = AgentEngineService()
