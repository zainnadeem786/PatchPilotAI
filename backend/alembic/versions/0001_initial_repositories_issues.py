"""Initial schema for repositories and issues.

Revision ID: 0001
Revises: 
Create Date: 2026-09-21 12:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create repositories table
    op.create_table(
        'repositories',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('github_id', sa.BigInteger(), nullable=False),
        sa.Column('owner', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=512), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('default_branch', sa.String(length=100), server_default='main', nullable=False),
        sa.Column('private', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('html_url', sa.String(length=1024), nullable=False),
        sa.Column('language', sa.String(length=100), nullable=True),
        sa.Column('open_issues_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_repositories_id'), 'repositories', ['id'], unique=False)
    op.create_index(op.f('ix_repositories_github_id'), 'repositories', ['github_id'], unique=True)
    op.create_index(op.f('ix_repositories_owner'), 'repositories', ['owner'], unique=False)
    op.create_index(op.f('ix_repositories_name'), 'repositories', ['name'], unique=False)
    op.create_index(op.f('ix_repositories_full_name'), 'repositories', ['full_name'], unique=True)

    # 2. Create issues table
    op.create_table(
        'issues',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('repository_id', sa.Integer(), nullable=False),
        sa.Column('github_issue_id', sa.BigInteger(), nullable=True),
        sa.Column('number', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=512), nullable=False),
        sa.Column('body', sa.Text(), nullable=True),
        sa.Column('state', sa.String(length=50), server_default='open', nullable=False),
        sa.Column('html_url', sa.String(length=1024), nullable=True),
        sa.Column('author', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['repository_id'], ['repositories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_issues_id'), 'issues', ['id'], unique=False)
    op.create_index(op.f('ix_issues_repository_id'), 'issues', ['repository_id'], unique=False)
    op.create_index(op.f('ix_issues_github_issue_id'), 'issues', ['github_issue_id'], unique=False)
    op.create_index(op.f('ix_issues_number'), 'issues', ['number'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_issues_number'), table_name='issues')
    op.drop_index(op.f('ix_issues_github_issue_id'), table_name='issues')
    op.drop_index(op.f('ix_issues_repository_id'), table_name='issues')
    op.drop_index(op.f('ix_issues_id'), table_name='issues')
    op.drop_table('issues')

    op.drop_index(op.f('ix_repositories_full_name'), table_name='repositories')
    op.drop_index(op.f('ix_repositories_name'), table_name='repositories')
    op.drop_index(op.f('ix_repositories_owner'), table_name='repositories')
    op.drop_index(op.f('ix_repositories_github_id'), table_name='repositories')
    op.drop_index(op.f('ix_repositories_id'), table_name='repositories')
    op.drop_table('repositories')
