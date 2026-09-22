"""Security & Audit Agent: screens the issue and any proposed patch for CWE/OWASP risk patterns."""

import re
from typing import List, Tuple
from app.agents.base import BaseAgent
from app.agents.types import AgentContext, AgentFinding, AgentResult

SYSTEM_PROMPT = (
    "You are the Security & Audit Agent in PatchPilot AI. Review the issue "
    "description and any proposed patch for security regressions before it "
    "reaches a pull request: injection flaws, unsafe eval/exec, shell "
    "execution, hardcoded secrets, and other common CWE/OWASP categories. "
    "List concrete findings with a severity (low, medium, high, critical); "
    "if nothing concerning is present, say so explicitly."
)

USER_PROMPT_TEMPLATE = (
    "Repository: {full_name} (primary language: {language})\n"
    "Issue #{number}: {title}\n"
    "Description:\n{body}\n\n"
    "Proposed patch (if any):\n{patch}\n\n"
    "Audit the above for security regressions."
)

# (pattern, title, severity, category) - static CWE/OWASP-style heuristics.
_RULES: List[Tuple[re.Pattern, str, str, str]] = [
    (re.compile(r"\beval\s*\("), "Use of eval()", "high", "CWE-95"),
    (re.compile(r"\bexec\s*\("), "Use of exec()", "high", "CWE-95"),
    (re.compile(r"\bos\.system\s*\("), "Shell execution via os.system()", "high", "CWE-78"),
    (re.compile(r"subprocess\.\w+\([^)]*shell\s*=\s*True"), "subprocess call with shell=True", "high", "CWE-78"),
    (re.compile(r"\bpickle\.loads?\s*\("), "Untrusted deserialization via pickle", "high", "CWE-502"),
    (re.compile(r"\binnerHTML\s*="), "Direct innerHTML assignment (possible DOM XSS)", "medium", "CWE-79"),
    (re.compile(r"\bdangerouslySetInnerHTML\b"), "React dangerouslySetInnerHTML usage (possible XSS)", "medium", "CWE-79"),
    (re.compile(r"(api[_-]?key|secret|password|token)\s*=\s*['\"][^'\"]{6,}['\"]", re.IGNORECASE), "Hardcoded credential-like literal", "critical", "CWE-798"),
    (re.compile(r"select\s+.*\+\s*['\"]|['\"]\s*\+\s*.*select\s", re.IGNORECASE), "String-concatenated SQL query (possible SQL injection)", "high", "CWE-89"),
]


def _scan(text: str) -> List[AgentFinding]:
    findings: List[AgentFinding] = []
    for pattern, title, severity, category in _RULES:
        if pattern.search(text):
            findings.append(
                AgentFinding(
                    title=title,
                    detail=f"Pattern matched in reviewed text ({category}).",
                    severity=severity,
                    category="security",
                )
            )
    return findings


class SecurityAuditAgent(BaseAgent):
    """Screens the issue text and any proposed patch for known-risky patterns."""

    @property
    def name(self) -> str:
        return "security_audit"

    async def run(self, context: AgentContext) -> AgentResult:
        if self.llm_client.is_llm_mode:
            return await self._run_llm(context)
        return self._run_static(context)

    def _run_static(self, context: AgentContext) -> AgentResult:
        issue = context.issue
        patch_result = context.previous_results.get("patch_synthesis")
        patch = (patch_result.data.get("diff") or "") if patch_result else ""

        combined_text = f"{issue.title} {issue.body or ''}\n{patch}" if issue else patch
        findings = _scan(combined_text)

        if not findings:
            findings.append(
                AgentFinding(
                    title="No known-risky patterns detected",
                    detail=(
                        "Static regex screening found no matches against the configured "
                        "CWE/OWASP pattern set. This is not a full security audit."
                    ),
                    severity="info",
                    category="security",
                )
            )

        highest = max((f.severity for f in findings), key=lambda s: {"info": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}[s])

        return AgentResult(
            agent_name=self.name,
            status="success",
            mode="static",
            summary=f"Static security screen found {len([f for f in findings if f.severity != 'info'])} risk pattern(s); highest severity: {highest}.",
            findings=findings,
            data={"highest_severity": highest},
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
            summary="LLM-generated security audit.",
            findings=[
                AgentFinding(
                    title="LLM security audit",
                    detail=completion,
                    severity="medium",
                    category="security",
                )
            ],
            data={"raw_completion": completion},
        )
