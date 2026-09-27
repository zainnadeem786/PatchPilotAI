"""Vercel Serverless Function entrypoint for PatchPilot FastAPI backend.

Exposes the canonical FastAPI `app` instance from `backend/app/main.py`
for deployment on Vercel's Python runtime.
"""

import sys
from pathlib import Path

# Add backend directory to sys.path so app.* imports resolve properly
current_dir = Path(__file__).resolve().parent
repo_root = current_dir.parent

search_paths = [
    repo_root / "backend",
    Path.cwd() / "backend",
    repo_root,
    Path.cwd(),
]

for path in search_paths:
    if (path / "app").is_dir() and str(path) not in sys.path:
        sys.path.insert(0, str(path))
        break

from app.main import app  # noqa: E402

__all__ = ["app"]
