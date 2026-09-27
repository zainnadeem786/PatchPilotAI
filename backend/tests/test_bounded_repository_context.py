"""Phase 6 Part 3 tests: bounded repository context — file/snippet caps and secret exclusion."""

import base64
import pytest
from app.services.agent_engine_service import (
    agent_engine_service,
    _ISSUE_BODY_TRUNCATION_MARKER,
)
from app.agents.types import RepositoryFileEntry
from app.models.repository import Repository


def _repo() -> Repository:
    return Repository(
        id=1, github_id=1, owner="acme", name="widget", full_name="acme/widget",
        default_branch="main", private=False, html_url="https://github.com/acme/widget",
        language="Python", open_issues_count=0, open_pull_requests_count=0,
    )


def _b64_file(path: str, text: str) -> dict:
    return {
        "path": path,
        "encoding": "base64",
        "content": base64.b64encode(text.encode("utf-8")).decode("ascii"),
    }


@pytest.mark.anyio
async def test_snippet_loader_excludes_secret_like_files(monkeypatch):
    files = [
        RepositoryFileEntry(path=".env", type="file"),
        RepositoryFileEntry(path="app/secrets.py", type="file"),
        RepositoryFileEntry(path="id_rsa", type="file"),
        RepositoryFileEntry(path="app/main.py", type="file"),
    ]

    async def mock_get_contents(owner, name, path="", token=None):
        return _b64_file(path, f"# contents of {path}")

    monkeypatch.setattr("app.services.agent_engine_service.github_service.get_repository_contents", mock_get_contents)

    snippets = await agent_engine_service._load_repository_snippets(_repo(), files)

    assert ".env" not in snippets
    assert "app/secrets.py" not in snippets
    assert "id_rsa" not in snippets
    assert "app/main.py" in snippets


@pytest.mark.anyio
async def test_snippet_loader_caps_file_count(monkeypatch):
    files = [RepositoryFileEntry(path=f"app/mod_{i}.py", type="file") for i in range(20)]

    async def mock_get_contents(owner, name, path="", token=None):
        return _b64_file(path, "print('hi')")

    monkeypatch.setattr("app.services.agent_engine_service.github_service.get_repository_contents", mock_get_contents)

    snippets = await agent_engine_service._load_repository_snippets(_repo(), files)

    assert len(snippets) <= 5


@pytest.mark.anyio
async def test_snippet_loader_truncates_large_files(monkeypatch):
    files = [RepositoryFileEntry(path="app/big.py", type="file")]
    huge_text = "x" * 10_000

    async def mock_get_contents(owner, name, path="", token=None):
        return _b64_file(path, huge_text)

    monkeypatch.setattr("app.services.agent_engine_service.github_service.get_repository_contents", mock_get_contents)

    snippets = await agent_engine_service._load_repository_snippets(_repo(), files)

    assert len(snippets["app/big.py"]) <= 2000


@pytest.mark.anyio
async def test_snippet_loader_ignores_non_source_extensions(monkeypatch):
    files = [
        RepositoryFileEntry(path="README.md", type="file"),
        RepositoryFileEntry(path="app/main.py", type="file"),
        RepositoryFileEntry(path="docs", type="dir"),
    ]

    async def mock_get_contents(owner, name, path="", token=None):
        return _b64_file(path, "content")

    monkeypatch.setattr("app.services.agent_engine_service.github_service.get_repository_contents", mock_get_contents)

    snippets = await agent_engine_service._load_repository_snippets(_repo(), files)

    assert "README.md" not in snippets
    assert "docs" not in snippets
    assert "app/main.py" in snippets


@pytest.mark.anyio
async def test_snippet_loader_is_best_effort_on_github_failure(monkeypatch):
    files = [RepositoryFileEntry(path="app/main.py", type="file")]

    async def mock_get_contents(owner, name, path="", token=None):
        raise RuntimeError("GitHub unavailable")

    monkeypatch.setattr("app.services.agent_engine_service.github_service.get_repository_contents", mock_get_contents)

    snippets = await agent_engine_service._load_repository_snippets(_repo(), files)

    assert snippets == {}


def _issue(body: str | None):
    from app.models.issue import Issue
    return Issue(
        id=10,
        repository_id=1,
        github_issue_id=1001,
        number=42,
        title="Test issue",
        body=body,
        state="open",
        author="alice",
        html_url="https://github.com/acme/widget/issues/42",
    )


@pytest.mark.anyio
async def test_build_context_truncates_oversized_issue_body(monkeypatch):
    async def mock_files(repo):
        return []

    async def mock_snippets(repo, files):
        return {}

    monkeypatch.setattr(agent_engine_service, "_load_repository_files", mock_files)
    monkeypatch.setattr(agent_engine_service, "_load_repository_snippets", mock_snippets)

    huge_body = "A" * 15_000
    issue = _issue(huge_body)
    context = await agent_engine_service._build_context(_repo(), issue)

    assert context.issue is not None
    assert context.issue.body.startswith("A" * 8000)
    assert "[... truncated by PatchPilot" in context.issue.body
    assert len(context.issue.body) == 8000 + len(_ISSUE_BODY_TRUNCATION_MARKER)


@pytest.mark.anyio
async def test_build_context_preserves_short_issue_body(monkeypatch):
    async def mock_files(repo):
        return []

    async def mock_snippets(repo, files):
        return {}

    monkeypatch.setattr(agent_engine_service, "_load_repository_files", mock_files)
    monkeypatch.setattr(agent_engine_service, "_load_repository_snippets", mock_snippets)

    short_body = "Short safe description."
    issue = _issue(short_body)
    context = await agent_engine_service._build_context(_repo(), issue)

    assert context.issue is not None
    assert context.issue.body == short_body
    assert "[... truncated" not in context.issue.body


@pytest.mark.anyio
async def test_build_context_boundary_and_none_body(monkeypatch):
    async def mock_files(repo):
        return []

    async def mock_snippets(repo, files):
        return {}

    monkeypatch.setattr(agent_engine_service, "_load_repository_files", mock_files)
    monkeypatch.setattr(agent_engine_service, "_load_repository_snippets", mock_snippets)

    # 1. Exactly 8000 characters: must NOT truncate
    body_8000 = "B" * 8000
    ctx_8000 = await agent_engine_service._build_context(_repo(), _issue(body_8000))
    assert ctx_8000.issue is not None
    assert ctx_8000.issue.body == body_8000
    assert "[... truncated" not in ctx_8000.issue.body

    # 2. Exactly 8001 characters: MUST truncate
    body_8001 = "C" * 8001
    ctx_8001 = await agent_engine_service._build_context(_repo(), _issue(body_8001))
    assert ctx_8001.issue is not None
    assert ctx_8001.issue.body.startswith("C" * 8000)
    assert "[... truncated by PatchPilot" in ctx_8001.issue.body
    assert len(ctx_8001.issue.body) == 8000 + len(_ISSUE_BODY_TRUNCATION_MARKER)

    # 3. None body: must remain None
    ctx_none = await agent_engine_service._build_context(_repo(), _issue(None))
    assert ctx_none.issue is not None
    assert ctx_none.issue.body is None
