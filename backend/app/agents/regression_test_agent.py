"""Regression & Test Synthesis Agent: drafts a test that reproduces the reported bug."""

import re
from app.agents.base import BaseAgent
from app.agents.types import AgentContext, AgentFinding, AgentResult

SYSTEM_PROMPT = (
    "You are the Regression & Test Synthesis Agent in PatchPilot AI. Given an "
    "issue description and (if available) a proposed patch, write a single "
    "automated test that fails against the current code and passes once the "
    "patch is applied. Use the repository's primary language and its "
    "conventional test framework (pytest for Python, Jest for "
    "JavaScript/TypeScript, JUnit for Java, etc). Output only the test code."
)

USER_PROMPT_TEMPLATE = (
    "Repository: {full_name} (primary language: {language})\n"
    "Issue #{number}: {title}\n"
    "Description:\n{body}\n\n"
    "Proposed patch (if any):\n{patch}\n\n"
    "Write one regression test reproducing this issue."
)

_LANGUAGE_TEMPLATES = {
    "python": (
        "def test_issue_{number}_regression():\n"
        "    \"\"\"TODO: reproduce issue #{number} - {title}.\"\"\"\n"
        "    raise NotImplementedError(\"Fill in reproduction steps for issue #{number}\")\n"
    ),
    "javascript": (
        "test('issue #{number} regression - {title}', () => {{\n"
        "  // TODO: reproduce issue #{number}\n"
        "  throw new Error('Fill in reproduction steps for issue #{number}');\n"
        "}});\n"
    ),
    "typescript": (
        "test('issue #{number} regression - {title}', () => {{\n"
        "  // TODO: reproduce issue #{number}\n"
        "  throw new Error('Fill in reproduction steps for issue #{number}');\n"
        "}});\n"
    ),
}

_DEFAULT_TEMPLATE = (
    "// TODO: reproduce issue #{number} - {title}\n"
    "// Regression test skeleton (language not recognized for a framework-specific template)\n"
)


def _slug(title: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "_", title.strip().lower()).strip("_")[:60]


class RegressionTestSynthesisAgent(BaseAgent):
    """Drafts a reproduction test skeleton (static mode) or full test body (LLM mode)."""

    @property
    def name(self) -> str:
        return "regression_test_synthesis"

    async def run(self, context: AgentContext) -> AgentResult:
        if self.llm_client.is_llm_mode:
            return await self._run_llm(context)
        return self._run_static(context)

    def _run_static(self, context: AgentContext) -> AgentResult:
        issue = context.issue
        if issue is None:
            return AgentResult(
                agent_name=self.name,
                status="success",
                mode="static",
                summary="No issue was attached to this analysis; no regression test was drafted.",
                data={"test_code": None},
            )

        language = (context.repository.language or "").lower()
        template = _LANGUAGE_TEMPLATES.get(language, _DEFAULT_TEMPLATE)
        test_code = template.format(number=issue.number, title=_slug(issue.title) or "reported_bug")

        return AgentResult(
            agent_name=self.name,
            status="success",
            mode="static",
            summary=f"Drafted a regression test skeleton for issue #{issue.number}.",
            findings=[
                AgentFinding(
                    title=f"Regression test skeleton for issue #{issue.number}",
                    detail=test_code,
                    severity="info",
                    category="test",
                )
            ],
            data={"test_code": test_code},
        )

    async def _run_llm(self, context: AgentContext) -> AgentResult:
        issue = context.issue
        patch_result = context.previous_results.get("patch_synthesis")
        patch = patch_result.data.get("diff") if patch_result else None

        user_prompt = USER_PROMPT_TEMPLATE.format(
            full_name=context.repository.full_name,
            language=context.repository.language or "unknown",
            number=issue.number if issue else "N/A",
            title=issue.title if issue else "(no issue attached)",
            body=(issue.body or "(no description provided)") if issue else "(no issue attached)",
            patch=patch or "(no patch proposed)",
        )
        completion = await self.llm_client.complete(SYSTEM_PROMPT, user_prompt)

        return AgentResult(
            agent_name=self.name,
            status="success",
            mode="llm",
            summary="LLM-generated regression test.",
            findings=[
                AgentFinding(
                    title="Generated regression test",
                    detail=completion,
                    severity="info",
                    category="test",
                )
            ],
            data={"test_code": completion},
        )
