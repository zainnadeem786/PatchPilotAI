"""Tests for the LLMClient abstraction: static-mode guard and mocked HTTP call in llm mode."""

import httpx
import pytest
from app.agents.llm_client import LLMClient, LLMClientError


@pytest.mark.anyio
async def test_static_mode_raises_without_calling_network():
    """Verify static mode never attempts an HTTP call and raises LLMClientError."""
    client = LLMClient(mode="static")

    with pytest.raises(LLMClientError):
        await client.complete("system prompt", "user prompt")


@pytest.mark.anyio
async def test_llm_mode_returns_completion_content(monkeypatch):
    """Verify llm mode posts to '{base_url}/chat/completions' and parses the completion content."""
    captured = {}

    async def mock_post(self, url, json=None, headers=None, **kwargs):
        captured["url"] = url
        captured["json"] = json
        captured["headers"] = headers
        payload = {"choices": [{"message": {"content": "Looks like a null pointer on line 42."}}]}
        return httpx.Response(200, json=payload, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    client = LLMClient(
        mode="llm",
        base_url="http://localhost:8000/v1",
        model="llama-3.1-8b-instruct",
        api_key="test-key",
    )

    result = await client.complete("system prompt", "user prompt")

    assert result == "Looks like a null pointer on line 42."
    assert captured["url"] == "http://localhost:8000/v1/chat/completions"
    assert captured["json"]["model"] == "llama-3.1-8b-instruct"
    assert captured["headers"]["Authorization"] == "Bearer test-key"


@pytest.mark.anyio
async def test_llm_mode_raises_on_non_success_response(monkeypatch):
    """Verify a non-2xx upstream response is surfaced as LLMClientError."""
    async def mock_post(self, url, json=None, headers=None, **kwargs):
        return httpx.Response(500, text="internal error", request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    client = LLMClient(mode="llm", base_url="http://localhost:8000/v1", model="test-model")

    with pytest.raises(LLMClientError):
        await client.complete("system prompt", "user prompt")


@pytest.mark.anyio
async def test_llm_mode_raises_on_malformed_response(monkeypatch):
    """Verify a response missing the expected 'choices' shape is surfaced as LLMClientError."""
    async def mock_post(self, url, json=None, headers=None, **kwargs):
        return httpx.Response(200, json={"unexpected": "shape"}, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    client = LLMClient(mode="llm", base_url="http://localhost:8000/v1", model="test-model")

    with pytest.raises(LLMClientError):
        await client.complete("system prompt", "user prompt")


def test_is_llm_mode_requires_both_mode_and_base_url():
    """Verify `is_llm_mode` is False unless mode='llm' AND a base_url is configured."""
    assert LLMClient(mode="static", base_url="http://localhost:8000/v1").is_llm_mode is False
    assert LLMClient(mode="llm", base_url="").is_llm_mode is False
    assert LLMClient(mode="llm", base_url="http://localhost:8000/v1").is_llm_mode is True
