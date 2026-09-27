"""Add Phase 7 validation_runs table.

Revision ID: 0004
Revises: 0003
Create Date: 2026-09-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0004'
down_revision: Union[str, None] = '0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'validation_runs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('analysis_run_id', sa.Integer(), nullable=False),
        sa.Column('repository_id', sa.Integer(), nullable=False),
        sa.Column('issue_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=40), server_default='validation_unavailable', nullable=False),
        sa.Column('tests_run', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('exit_code', sa.Integer(), nullable=True),
        sa.Column('stdout', sa.Text(), nullable=True),
        sa.Column('stderr', sa.Text(), nullable=True),
        sa.Column('duration_ms', sa.Integer(), server_default='0', nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.Column('executed_command', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['analysis_run_id'], ['analysis_runs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['repository_id'], ['repositories.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['issue_id'], ['issues.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_validation_runs_id'), 'validation_runs', ['id'], unique=False)
    op.create_index(op.f('ix_validation_runs_analysis_run_id'), 'validation_runs', ['analysis_run_id'], unique=False)
    op.create_index(op.f('ix_validation_runs_repository_id'), 'validation_runs', ['repository_id'], unique=False)
    op.create_index(op.f('ix_validation_runs_issue_id'), 'validation_runs', ['issue_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_validation_runs_issue_id'), table_name='validation_runs')
    op.drop_index(op.f('ix_validation_runs_repository_id'), table_name='validation_runs')
    op.drop_index(op.f('ix_validation_runs_analysis_run_id'), table_name='validation_runs')
    op.drop_index(op.f('ix_validation_runs_id'), table_name='validation_runs')
    op.drop_table('validation_runs')
