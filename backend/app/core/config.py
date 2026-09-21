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
    GITHUB_REDIRECT_URI: str = "http://localhost:3000/api/github/callback"
    GITHUB_API_BASE_URL: str = "https://api.github.com"

    # Future AI API Key placeholder (Inactive in Phase 3)
    AI_API_KEY: str = ""

    @property
    def github_configured(self) -> bool:
        """Check if GitHub OAuth credentials are configured."""
        return bool(self.GITHUB_CLIENT_ID and self.GITHUB_CLIENT_SECRET)


settings = Settings()
