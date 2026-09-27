"""Vercel Serverless Function entrypoint for PatchPilot FastAPI backend.

Exposes the canonical FastAPI `app` instance from `backend/app/main.py`
for deployment on Vercel's Python runtime. Includes ASGI path normalization
middleware to handle Vercel rewrite headers (e.g. `x-matched-path`) and routing.
"""

import sys
from pathlib import Path
from starlette.types import ASGIApp, Scope, Receive, Send

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


class VercelPathMiddleware:
    """ASGI Middleware to normalize request paths when deployed on Vercel."""

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] == "http":
            # Extract headers from scope
            headers = dict(scope.get("headers", []))

            # Retrieve original requested path from Vercel's routing headers
            original_path = None
            for h in (
                b"x-matched-path",
                b"x-forwarded-uri",
                b"x-invoke-path",
                b"x-real-path",
                b"x-original-url",
            ):
                if h in headers:
                    val = headers[h].decode("latin1", errors="ignore")
                    if val:
                        original_path = val.split("?")[0]
                        break

            current_path = scope.get("path", "")

            # If Vercel rewrote the path to the function entrypoint itself,
            # use the original matched path from the routing header
            if original_path and not original_path.endswith("index.py"):
                resolved = original_path
            elif current_path in ("/api/index.py", "/index.py", "/api/index", "/api/index/"):
                resolved = "/"
            else:
                resolved = current_path

            if not resolved.startswith("/"):
                resolved = "/" + resolved

            # Strip trailing slash if present (except root)
            if resolved != "/" and resolved.endswith("/"):
                resolved = resolved.rstrip("/")

            # Route adaptation for standard endpoint access:
            # - /health -> /api/health
            # - /v1/* -> /api/v1/*
            # - /openapi.json -> /api/v1/openapi.json
            # - /api/docs -> /docs
            # - /api/redoc -> /redoc
            if resolved == "/health":
                resolved = "/api/health"
            elif resolved.startswith("/v1/"):
                resolved = "/api" + resolved
            elif resolved == "/openapi.json":
                resolved = "/api/v1/openapi.json"
            elif resolved == "/api/docs":
                resolved = "/docs"
            elif resolved == "/api/redoc":
                resolved = "/redoc"

            scope = dict(scope)
            scope["path"] = resolved
            scope["raw_path"] = resolved.encode("latin1")

            # Reset root_path if Vercel set it to the script path
            if scope.get("root_path") in ("/api/index.py", "/index.py", "/api/index"):
                scope["root_path"] = ""

        await self.app(scope, receive, send)


# Register the middleware on the FastAPI app instance
app.add_middleware(VercelPathMiddleware)

__all__ = ["app"]
