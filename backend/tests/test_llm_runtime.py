"""Phase 6 tests for the LLM runtime: config-driven defaults, timeouts, and missing credentials."""

import httpx
import pytest
from app.agents.llm_client import LLMClient, LLMClientError
from app.core.config import settings


@pytest.mark.anyio
async def test_missing_provider_raises_configured_error():
    """mode != 'llm' (no provider configured) -> 'LLM provider is not configured.'"""
    client = LLMClient(mode="static")
    with pytest.raises(LLMClientError, match="not configured"):
        await client.complete("system", "user")


@pytest.mark.anyio
async def test_missing_base_url_raises_configured_error():
    """llm mode with an empty base_url is treated as unconfigured, not a network attempt."""
    client = LLMClient(mode="llm", base_url="")
    with pytest.raises(LLMClientError, match="not configured"):
        await client.complete("system", "user")


@pytest.mark.anyio
async def test_missing_api_key_omits_auth_header_and_surfaces_provider_error(monkeypatch):
    """No API key configured -> request is sent without an Authorization header; a 401 becomes 'LLM provider unavailable.'"""
    captured = {}

    async def mock_post(self, url, json=None, headers=None, **kwargs):
        captured["headers"] = headers
        return httpx.Response(401, text="unauthorized", request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    client = LLMClient(mode="llm", base_url="http://localhost:8000/v1", model="test-model", api_key="")

    with pytest.raises(LLMClientError, match="unavailable"):
        await client.complete("system", "user")

    assert "Authorization" not in captured["headers"]


@pytest.mark.anyio
async def test_timeout_raises_timed_out_error(monkeypatch):
    """A network timeout is surfaced verbatim as 'LLM request timed out.'"""
    async def mock_post(self, url, json=None, headers=None, **kwargs):
        raise httpx.TimeoutException("simulated timeout")

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    client = LLMClient(mode="llm", base_url="http://localhost:8000/v1", model="test-model")

    with pytest.raises(LLMClientError, match="timed out"):
        await client.complete("system", "user")


@pytest.mark.anyio
async def test_provider_network_error_raises_unavailable_error(monkeypatch):
    """A connection-level failure is surfaced as 'LLM provider unavailable.' without leaking exception internals like headers."""
    async def mock_post(self, url, json=None, headers=None, **kwargs):
        raise httpx.ConnectError("simulated connection refused")

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    client = LLMClient(mode="llm", base_url="http://localhost:8000/v1", model="test-model", api_key="secret-key-123")

    with pytest.raises(LLMClientError) as exc_info:
        await client.complete("system", "user")

    assert "unavailable" in str(exc_info.value)
    assert "secret-key-123" not in str(exc_info.value)


@pytest.mark.anyio
async def test_malformed_json_body_raises_invalid_structured_response(monkeypatch):
    """A 200 response whose body isn't even valid JSON is surfaced as 'LLM returned an invalid structured response.'"""
    async def mock_post(self, url, json=None, headers=None, **kwargs):
        return httpx.Response(200, content=b"not json at all", request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    client = LLMClient(mode="llm", base_url="http://localhost:8000/v1", model="test-model")

    with pytest.raises(LLMClientError, match="invalid structured response"):
        await client.complete("system", "user")


@pytest.mark.anyio
async def test_default_max_tokens_comes_from_settings(monkeypatch):
    """Default LLMClient() uses settings.LLM_MAX_TOKENS as the payload's max_tokens unless overridden."""
    captured = {}

    async def mock_post(self, url, json=None, headers=None, **kwargs):
        captured["json"] = json
        payload = {"choices": [{"message": {"content": "ok"}}]}
        return httpx.Response(200, json=payload, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    client = LLMClient(mode="llm", base_url="http://localhost:8000/v1", model="test-model")
    await client.complete("system", "user")

    assert captured["json"]["max_tokens"] == settings.LLM_MAX_TOKENS


@pytest.mark.anyio
async def test_explicit_max_tokens_overrides_client_default(monkeypatch):
    captured = {}

    async def mock_post(self, url, json=None, headers=None, **kwargs):
        captured["json"] = json
        payload = {"choices": [{"message": {"content": "ok"}}]}
        return httpx.Response(200, json=payload, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    client = LLMClient(mode="llm", base_url="http://localhost:8000/v1", model="test-model", max_tokens=64)
    await client.complete("system", "user", max_tokens=256)

    assert captured["json"]["max_tokens"] == 256


def test_client_provider_defaults_from_settings():
    client = LLMClient()
    assert client.provider == settings.LLM_PROVIDER


def test_client_provider_can_be_overridden():
    client = LLMClient(provider="azure-openai")
    assert client.provider == "azure-openai"
