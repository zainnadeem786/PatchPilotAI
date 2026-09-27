"""Shared data structures passed between agents in the AI Agent Engine pipeline."""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class RepositoryContext:
    """Snapshot of a tracked repository (Phase 3 `Repository` row) handed to agents."""

    id: int
    owner: str
    name: str
    full_name: str
    default_branch: str
    language: Optional[str]
    html_url: str
    description: Optional[str] = None


@dataclass
class IssueContext:
    """Snapshot of a tracked issue (Phase 3 `Issue` row) handed to agents."""

    id: int
    number: int
    title: str
    body: Optional[str]
    state: str
    author: Optional[str]
    html_url: Optional[str]


@dataclass
class RepositoryFileEntry:
    """A single file or directory entry from the repository tree (GitHub contents API)."""

    path: str
    type: str
    size: Optional[int] = None


@dataclass
class AgentFinding:
    """A single discrete finding produced by an agent."""

    title: str
    detail: str
    severity: str = "info"
    category: Optional[str] = None
    file_path: Optional[str] = None


@dataclass
class AgentResult:
    """Typed outcome of a single agent's `run()` call."""

    agent_name: str
    status: str
    mode: str
    summary: str
    findings: List[AgentFinding] = field(default_factory=list)
    data: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None


@dataclass
class AgentContext:
    """Execution context passed to every agent's `run()` call.

    Populated once by `AgentEngineService` from already-persisted Phase 3 data
    (`Repository`, `Issue` models) and a best-effort GitHub contents listing.
    Agents read from this context only - they never query the database, call
    GitHub, or re-parse source files themselves.
    """

    repository: RepositoryContext
    issue: Optional[IssueContext] = None
    repository_files: List[RepositoryFileEntry] = field(default_factory=list)
    # Bounded, secret-excluded source snippets for a small capped subset of
    # top-level files - see AgentEngineService._load_repository_snippets for
    # the hard limits (file count, per-file length, denylisted filenames).
    repository_snippets: Dict[str, str] = field(default_factory=dict)
    previous_results: Dict[str, AgentResult] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    validation_result: Optional[Any] = None


@dataclass
class EngineResult:
    """Final aggregated output of a full AI Agent Engine pipeline run."""

    repository_id: int
    issue_id: Optional[int]
    results: List[AgentResult] = field(default_factory=list)
    roadmap: List[str] = field(default_factory=list)
    validation: Optional[Dict[str, Any]] = None
