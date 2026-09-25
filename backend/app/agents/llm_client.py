"""LLM client abstraction shared by every agent (static rule-based mode + OpenAI-compatible mode)."""

from typing import Optional
import httpx
from app.core.config import settings


class LLMClientError(Exception):
    """Raised when a model-backed completion cannot be produced."""
    pass


class LLMClient:
    """Single point of access to language-model completions for all agents.

    Two modes:
    - **static** (default, no API key required): `is_llm_mode` is `False` and
      `complete()` raises `LLMClientError`, signalling callers to fall back to
      their deterministic rule-based analysis.
    - **llm**: `complete()` calls the chat completions endpoint of any
      OpenAI-compatible server - OpenAI, Azure OpenAI, or a self-hosted vLLM
      deployment such as AMD Developer Cloud / ROCm - using `AI_BASE_URL` and
      `AI_MODEL`. No code changes are needed to switch providers; only the
      environment configuration changes.

    A single instance is constructed at import time (`llm_client`, mirroring
    the `github_service` singleton pattern) and injected into every agent so
    agents never instantiate their own HTTP clients.
    """

    def __init__(
        self,
        mode: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: Optional[float] = None,
    ):
        self.mode = (mode if mode is not None else settings.AI_MODE).lower()
        self.base_url = (base_url if base_url is not None else settings.AI_BASE_URL).rstrip("/")
        self.model = model if model is not None else settings.AI_MODEL
        self.api_key = api_key if api_key is not None else settings.AI_API_KEY
        self.timeout = timeout if timeout is not None else settings.AI_REQUEST_TIMEOUT_SECONDS

    @property
    def is_llm_mode(self) -> bool:
        """Whether this client is configured to call a live LLM endpoint."""
        return self.mode == "llm" and bool(self.base_url)

    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> str:
        """Request a chat completion from the configured OpenAI-compatible endpoint.

        Raises:
            LLMClientError: If not configured for LLM mode, or the upstream request
                times out, fails on the network, or returns a non-success/malformed response.
        """
        if not self.is_llm_mode:
            raise LLMClientError(
                "LLM mode is not configured. Set AI_MODE=llm and AI_BASE_URL to enable model-backed analysis."
            )

        url = f"{self.base_url}/chat/completions"
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
            except httpx.TimeoutException:
                raise LLMClientError(f"LLM request to '{self.base_url}' timed out.")
            except httpx.RequestError as exc:
                raise LLMClientError(f"Network error contacting LLM endpoint: {str(exc)}")

        if not response.is_success:
            raise LLMClientError(
                f"LLM endpoint returned HTTP {response.status_code}: {response.text[:200]}"
            )

        data = response.json()
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            raise LLMClientError("LLM endpoint response did not contain a valid completion.")


# Singleton client instance, injected into every agent.
llm_client = LLMClient()
