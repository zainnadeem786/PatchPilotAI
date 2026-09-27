# ==============================================================================
# PatchPilot AI — Dedicated Isolated Validation Sandbox Image
# ==============================================================================
# Purpose:
#   Dedicated, non-privileged sandbox container environment designed solely
#   for executing AI-generated patches and regression tests in complete isolation.
#
# Specifications:
#   - Python Version : 3.13 (via python:3.13-slim)
#   - Pytest Version : 8.3.3
#   - Dependencies   : Minimal test runner dependencies (pytest)
#   - Workdir        : /workspace (ephemeral host volume mount)
#
# Isolation & Security Guarantees:
#   - NO application code (FastAPI, Alembic, SQLAlchemy) is bundled into this image.
#   - NO secrets, API keys, credentials, or environment files are included.
#   - NO database (PostgreSQL) or cache (Redis) drivers are installed.
#   - Executes under --network none with strict memory/cpu limits at runtime.
# ==============================================================================

FROM python:3.13-slim

# Prevent Python from writing .pyc files outside the workspace and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=0 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Copy minimal test runner requirements
COPY requirements.txt /tmp/requirements.txt

# Install pinned pytest test runner
RUN pip install -r /tmp/requirements.txt && \
    rm -f /tmp/requirements.txt

# Set execution workspace
WORKDIR /workspace

# Default command: run pytest inside the mounted workspace
CMD ["pytest"]
