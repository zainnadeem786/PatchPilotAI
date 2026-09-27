"""Vercel native entrypoint for PatchPilot FastAPI backend.

Exposes the canonical FastAPI `app` instance from `app.main`
for zero-configuration deployment on Vercel's FastAPI runtime.
"""

from app.main import app

__all__ = ["app"]
