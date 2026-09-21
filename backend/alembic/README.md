# Alembic Database Migrations

This directory manages relational schema migrations for PostgreSQL using Alembic.

## Common Commands (Windows / PowerShell)

Run commands using the project-local `.venv`:

```powershell
# Create a new migration revision based on SQLAlchemy models (Phase 3)
.\.venv\Scripts\alembic.exe revision --autogenerate -m "create initial models"

# Apply all pending migrations to the database
.\.venv\Scripts\alembic.exe upgrade head

# Rollback the last migration
.\.venv\Scripts\alembic.exe downgrade -1

# View migration history
.\.venv\Scripts\alembic.exe history --verbose
```
