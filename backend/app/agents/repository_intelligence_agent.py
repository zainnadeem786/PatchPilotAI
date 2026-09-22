"""Repository Intelligence Agent: localizes likely root-cause files for an issue."""

import re
from typing import List
from app.agents.base import BaseAgent
from app.agents.types import AgentContext, AgentFinding, AgentResult

SYSTEM_PROMPT = (
    "You are the Repository Intelligence Agent in PatchPilot AI. Given an "
    "issue description and a listing of top-level repository files, identify "
    "the files or modules most likely to contain the root cause and briefly "
    "explain why. You do not have file contents - reason from paths, names, "
    "and the issue text alone. Be concise."
)

USER_PROMPT_TEMPLATE = (
    "Repository: {full_name} (primary language: {language})\n"
    "Issue #{number}: {title}\n"
    "Description:\n{body}\n\n"
    "Top-level repository entries:\n{file_list}\n\n"
    "List the most likely suspect files/directories and a one-sentence root "
    "cause hypothesis for each."
)

_STOPWORDS = {
    "this", "that", "with", "have", "from", "when", "does", "should", "would",
    "could", "there", "which", "issue", "error", "the", "and", "for", "are",
    "was", "were", "will", "into", "your", "you", "not", "but", "its",
}


def _extract_keywords(text: str) -> List[str]:
    """Pull candidate root-word keywords (len > 3, alphabetic) out of issue text."""
    words = re.findall(r"[a-zA-Z_]{4,}", text.lower())
    return [w for w in words if w not in _STOPWORDS]


class RepositoryIntelligenceAgent(BaseAgent):
    """Localizes suspect files by matching issue keywords against the repo file tree."""

    @property
    def name(self) -> str:
        return "repository_intelligence"

    async def run(self, context: AgentContext) -> AgentResult:
        if self.llm_client.is_llm_mode:
            return await self._run_llm(context)
        return self._run_static(context)

    def _run_static(self, context: AgentContext) -> AgentResult:
        if not context.repository_files:
            return AgentResult(
                agent_name=self.name,
                status="success",
                mode="static",
                summary="No repository file listing was available; root-cause localization skipped.",
                findings=[
                    AgentFinding(
                        title="Repository tree unavailable",
                        detail=(
                            "GitHub contents could not be retrieved for this repository, so "
                            "keyword-based file matching could not run."
                        ),
                        severity="info",
                        category="root-cause",
                    )
                ],
                data={"suspect_files": []},
            )

        issue_text = f"{context.issue.title} {context.issue.body or ''}" if context.issue else ""
        keywords = set(_extract_keywords(issue_text))

        matches = []
        for entry in context.repository_files:
            file_tokens = set(re.findall(r"[a-zA-Z]{3,}", entry.path.lower()))
            if any(
                keyword in token or token in keyword
                for keyword in keywords
                for token in file_tokens
            ):
                matches.append(entry)

        findings = [
            AgentFinding(
                title=f"Candidate suspect file: {entry.path}",
                detail=f"File name matched a keyword from the issue text ('{entry.path}').",
                severity="medium",
                category="root-cause",
                file_path=entry.path,
            )
            for entry in matches[:10]
        ]

        if not findings:
            findings.append(
                AgentFinding(
                    title="No direct keyword matches found in repository tree",
                    detail=(
                        "No top-level file or directory name matched keywords extracted from "
                        "the issue text. A deeper AST-level index (planned) would be required "
                        "for more precise localization."
                    ),
                    severity="info",
                    category="root-cause",
                )
            )

        return AgentResult(
            agent_name=self.name,
            status="success",
            mode="static",
            summary=f"Matched {len(matches)} candidate file(s) via keyword heuristics.",
            findings=findings,
            data={"suspect_files": [entry.path for entry in matches]},
        )

    async def _run_llm(self, context: AgentContext) -> AgentResult:
        issue = context.issue
        file_list = "\n".join(
            f"- {entry.path} ({entry.type})" for entry in context.repository_files[:100]
        ) or "(no file listing available)"

        user_prompt = USER_PROMPT_TEMPLATE.format(
            full_name=context.repository.full_name,
            language=context.repository.language or "unknown",
            number=issue.number if issue else "N/A",
            title=issue.title if issue else "(no issue attached)",
            body=(issue.body or "(no description provided)") if issue else "(no issue attached)",
            file_list=file_list,
        )
        completion = await self.llm_client.complete(SYSTEM_PROMPT, user_prompt)

        return AgentResult(
            agent_name=self.name,
            status="success",
            mode="llm",
            summary="LLM-generated root-cause localization hypothesis.",
            findings=[
                AgentFinding(
                    title="LLM root-cause hypothesis",
                    detail=completion,
                    severity="medium",
                    category="root-cause",
                )
            ],
            data={"raw_completion": completion},
        )
