"""Application configuration management using Pydantic Settings."""

from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import json


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    # General
    PROJECT_NAME: str = "PatchPilot API"
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    # Database
    DATABASE_URL: str = (
        "postgresql+psycopg://postgres:postgres@localhost:5432/patchpilot"
    )

    # Redis Foundation
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security
    SECRET_KEY: str = "development-secret-key-replace-in-production"

    # GitHub Integration
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/api/v1/github/auth/callback"
    GITHUB_API_BASE_URL: str = "https://api.github.com"

    # Phase 4 — AI Agent Engine
    # AI_MODE "static" runs deterministic rule-based analysis with no external
    # calls. AI_MODE "llm" calls any OpenAI-compatible chat completions
    # endpoint - OpenAI itself, Azure OpenAI, or a self-hosted vLLM server
    # (e.g. AMD Developer Cloud / ROCm) - via AI_BASE_URL and AI_MODEL.
    AI_MODE: str = "static"
    AI_API_KEY: str = ""
    AI_BASE_URL: str = "https://api.openai.com/v1"
    AI_MODEL: str = "gpt-4o-mini"
    AI_REQUEST_TIMEOUT_SECONDS: float = 30.0

    # Phase 6 — LLM Runtime Integration
    # These two complete the Phase 6 "LLM_*" configuration surface without
    # duplicating the four settings already covered above:
    #   LLM_PROVIDER          -> new (identifies the OpenAI-compatible provider)
    #   LLM_MODEL              == AI_MODEL
    #   LLM_API_KEY             == AI_API_KEY
    #   LLM_BASE_URL            == AI_BASE_URL
    #   LLM_TIMEOUT_SECONDS     == AI_REQUEST_TIMEOUT_SECONDS
    #   LLM_MAX_TOKENS         -> new (response length cap for every agent call)
    LLM_PROVIDER: str = "openai"
    LLM_MAX_TOKENS: int = 1024

    # Phase 7 — Isolated Patch Validation & Test Execution
    VALIDATION_ENABLED: bool = True
    VALIDATION_SANDBOX_IMAGE: str = "patchpilot-sandbox:python3.13"
    VALIDATION_DOCKER_IMAGE: str = "patchpilot-sandbox:python3.13"
    VALIDATION_TIMEOUT_SECONDS: int = 60
    VALIDATION_MEMORY_LIMIT: str = "512m"
    VALIDATION_CPU_LIMIT: float = 1.0
    VALIDATION_MAX_OUTPUT_BYTES: int = 200000
    VALIDATION_NETWORK_MODE: str = "none"

    @property
    def github_configured(self) -> bool:
        """Check if GitHub OAuth credentials are configured."""
        return bool(
            self.GITHUB_CLIENT_ID
            and self.GITHUB_CLIENT_ID.strip()
            and self.GITHUB_CLIENT_SECRET
            and self.GITHUB_CLIENT_SECRET.strip()
        )

    @property
    def ai_llm_configured(self) -> bool:
        """Check if the agent engine is configured to call a live LLM endpoint."""
        return self.AI_MODE.lower() == "llm" and bool(self.AI_BASE_URL)

    @property
    def validation_configured(self) -> bool:
        """Check if patch validation layer is enabled."""
        return self.VALIDATION_ENABLED


settings = Settings()
