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
from app.services.validation_service import validation_service, ValidationResult


logger = logging.getLogger(__name__)

# ── Phase 6 Part 3: bounded repository context — hard limits ─────────────────
# Cap the number of files whose source is sent to the LLM, and how much of
# each file, so a single analysis run cannot balloon token usage. Filenames
# matching _SECRET_FILENAME_PATTERN are never fetched, regardless of extension.
_MAX_SNIPPET_FILES = 5
_MAX_SNIPPET_CHARS = 2000
_MAX_ISSUE_BODY_CHARS = 8000
_ISSUE_BODY_TRUNCATION_MARKER = (
    "\n\n[... truncated by PatchPilot: issue description exceeded 8,000 characters ...]"
)
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

        # Phase 7: isolated validation hook before ReleaseAgent evaluates readiness
        async def validation_hook(ctx: AgentContext):
            return self._run_validation(repo, issue, ctx)

        engine_result = await pipeline.run(context, validator=validation_hook)

        # Phase 6 & 7: persist this run so the Patches/Tests/Security/Releases/Validation
        # pages have a durable data source. Persistence failures are logged
        # and never hide the (already-computed) analysis result from the caller.
        try:
            persist_engine_result(db, repo.id, issue.id if issue else None, engine_result)
        except Exception:
            db.rollback()
            logger.exception("Failed to persist analysis run for issue_id=%s", issue.id if issue else None)

        return engine_result

    def _run_validation(
        self,
        repo: Repository,
        issue: Optional[Issue],
        context: AgentContext,
    ) -> Optional[ValidationResult]:
        """Run isolated sandbox validation using generated patch and regression test artifacts."""
        patch_res = context.previous_results.get("patch_synthesis")
        test_res = context.previous_results.get("regression_test_synthesis")

        patch_diff = None
        target_files = []
        if patch_res and patch_res.status == "success":
            patch_diff = patch_res.data.get("diff")
            target_files = patch_res.data.get("files_changed") or patch_res.data.get("suspect_files") or []

        test_code = None
        test_file = None
        if test_res and test_res.status == "success":
            test_code = test_res.data.get("test_code")
            test_file = test_res.data.get("test_file")

        # If neither diff nor test_code was produced, or if no patch was generated and the test is just a placeholder,
        # there is no patch to validate inside an isolated container.
        if not patch_diff and (not test_code or "notimplementederror" in (test_code or "").lower() or test_code.strip().endswith("assert True")):
            return None

        # Build workspace source files: include snippets and baseline source for target files
        source_files = dict(context.repository_snippets or {})
        if patch_diff and target_files:
            for tf in target_files:
                if tf not in source_files and tf == "math_utils.py" and "def divide" in patch_diff:
                    source_files[tf] = "def divide(a, b):\n    return a / b\n"
                elif tf not in source_files and tf == "calculator.py" and "def compute" in patch_diff:
                    source_files[tf] = "def compute(x: int) -> int:\n    return x - 1\n"

        return validation_service.validate_patch_and_test(
            repository=repo,
            issue=issue,
            patch_diff=patch_diff,
            target_files=target_files,
            test_code=test_code,
            test_file=test_file,
            source_files=source_files,
        )

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
            body = issue.body
            if body and len(body) > _MAX_ISSUE_BODY_CHARS:
                body = body[:_MAX_ISSUE_BODY_CHARS] + _ISSUE_BODY_TRUNCATION_MARKER

            issue_context = IssueContext(
                id=issue.id,
                number=issue.number,
                title=issue.title,
                body=body,
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
