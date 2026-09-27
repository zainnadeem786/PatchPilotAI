"""Shared helper for parsing structured JSON out of raw LLM completions.

Agents that ask the model for a structured object (Patch Synthesis, Regression
Test Synthesis) call `parse_llm_json` on the raw completion text. LLMs
routinely wrap JSON in ```json fences or add leading/trailing prose despite
being told not to, so this makes a best-effort extraction before giving up.
A `None` return means "could not be parsed" - callers must fall back to
showing the raw completion for human review rather than crashing or
fabricating structured fields.
"""

import json
import re
from typing import Any, Dict, Optional

_FENCE_PATTERN = re.compile(r"```(?:json)?\s*(\{.*\})\s*```", re.DOTALL)
_BRACE_PATTERN = re.compile(r"\{.*\}", re.DOTALL)


def parse_llm_json(completion: str) -> Optional[Dict[str, Any]]:
    """Best-effort parse of a JSON object out of a raw LLM completion string.

    Returns None (never raises) if no valid JSON object could be extracted.
    """
    if not completion or not isinstance(completion, str):
        return None

    candidates = []
    fence_match = _FENCE_PATTERN.search(completion)
    if fence_match:
        candidates.append(fence_match.group(1))

    stripped = completion.strip()
    candidates.append(stripped)

    brace_match = _BRACE_PATTERN.search(completion)
    if brace_match:
        candidates.append(brace_match.group(0))

    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except (ValueError, TypeError):
            continue
        if isinstance(parsed, dict):
            return parsed

    return None
