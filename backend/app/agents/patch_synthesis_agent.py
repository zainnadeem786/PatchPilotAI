"""Patch Synthesis Agent: proposes a remediation for the issue's suspect files."""

from app.agents.base import BaseAgent
from app.agents.types import AgentContext, AgentFinding, AgentResult

SYSTEM_PROMPT = (
    "You are the Patch Synthesis Agent in PatchPilot AI. Given an issue "
    "description and a list of suspect files identified by the Repository "
    "Intelligence Agent, propose a minimal, surgical fix. If you have enough "
    "information, express it as a unified diff (```diff fenced); otherwise, "
    "describe the precise code change required in plain language. Never "
    "invent APIs or files you have not been given. Do not alter unrelated "
    "behavior."
)

USER_PROMPT_TEMPLATE = (
    "Repository: {full_name} (primary language: {language})\n"
    "Issue #{number}: {title}\n"
    "Description:\n{body}\n\n"
    "Suspect files identified by Repository Intelligence:\n{suspect_files}\n\n"
    "Propose a minimal fix."
)


class PatchSynthesisAgent(BaseAgent):
    """Produces a remediation outline (static mode) or a proposed diff (LLM mode)."""

    @property
    def name(self) -> str:
        return "patch_synthesis"

    async def run(self, context: AgentContext) -> AgentResult:
        if self.llm_client.is_llm_mode:
            return await self._run_llm(context)
        return self._run_static(context)

    def _run_static(self, context: AgentContext) -> AgentResult:
        repo_intel = context.previous_results.get("repository_intelligence")
        suspect_files = repo_intel.data.get("suspect_files", []) if repo_intel else []

        if suspect_files:
            detail = (
                "Static mode does not generate source diffs. Review the following "
                f"candidate file(s) for the reported behavior and apply a targeted fix: "
                f"{', '.join(suspect_files)}."
            )
            severity = "medium"
        else:
            detail = (
                "No suspect files were localized, and static mode cannot synthesize a "
                "diff without model-backed code reasoning. Enable AI_MODE=llm for "
                "automated patch drafting."
            )
            severity = "info"

        return AgentResult(
            agent_name=self.name,
            status="success",
            mode="static",
            summary="Static mode produced a remediation outline only; no diff was generated.",
            findings=[
                AgentFinding(
                    title="Manual remediation outline",
                    detail=detail,
                    severity=severity,
                    category="patch",
                )
            ],
            data={"diff": None, "suspect_files": suspect_files},
        )

    async def _run_llm(self, context: AgentContext) -> AgentResult:
        issue = context.issue
        repo_intel = context.previous_results.get("repository_intelligence")
        suspect_files = repo_intel.data.get("suspect_files", []) if repo_intel else []

        user_prompt = USER_PROMPT_TEMPLATE.format(
            full_name=context.repository.full_name,
            language=context.repository.language or "unknown",
            number=issue.number if issue else "N/A",
            title=issue.title if issue else "(no issue attached)",
            body=(issue.body or "(no description provided)") if issue else "(no issue attached)",
            suspect_files="\n".join(f"- {path}" for path in suspect_files) or "(none identified)",
        )
        completion = await self.llm_client.complete(SYSTEM_PROMPT, user_prompt)

        return AgentResult(
            agent_name=self.name,
            status="success",
            mode="llm",
            summary="LLM-generated patch proposal.",
            findings=[
                AgentFinding(
                    title="Proposed patch",
                    detail=completion,
                    severity="medium",
                    category="patch",
                )
            ],
            data={"diff": completion, "suspect_files": suspect_files},
        )
