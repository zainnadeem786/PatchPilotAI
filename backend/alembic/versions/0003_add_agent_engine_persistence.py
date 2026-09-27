"""Add Phase 6 agent-engine persistence tables (analysis_runs, patches, regression_tests, security_findings, release_readiness).

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0003'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. analysis_runs
    op.create_table(
        'analysis_runs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('repository_id', sa.Integer(), nullable=False),
        sa.Column('issue_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=50), server_default='completed', nullable=False),
        sa.Column('roadmap', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['repository_id'], ['repositories.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['issue_id'], ['issues.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_analysis_runs_id'), 'analysis_runs', ['id'], unique=False)
    op.create_index(op.f('ix_analysis_runs_repository_id'), 'analysis_runs', ['repository_id'], unique=False)
    op.create_index(op.f('ix_analysis_runs_issue_id'), 'analysis_runs', ['issue_id'], unique=False)

    # 2. patches
    op.create_table(
        'patches',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('analysis_run_id', sa.Integer(), nullable=False),
        sa.Column('repository_id', sa.Integer(), nullable=False),
        sa.Column('issue_id', sa.Integer(), nullable=True),
        sa.Column('mode', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=30), server_default='Generated', nullable=False),
        sa.Column('review_status', sa.String(length=30), server_default='Pending Review', nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('files_changed', sa.JSON(), nullable=False),
        sa.Column('unified_diff', sa.Text(), nullable=True),
        sa.Column('reasoning', sa.Text(), nullable=True),
        sa.Column('risks', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['analysis_run_id'], ['analysis_runs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['repository_id'], ['repositories.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['issue_id'], ['issues.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_patches_id'), 'patches', ['id'], unique=False)
    op.create_index(op.f('ix_patches_analysis_run_id'), 'patches', ['analysis_run_id'], unique=False)
    op.create_index(op.f('ix_patches_repository_id'), 'patches', ['repository_id'], unique=False)
    op.create_index(op.f('ix_patches_issue_id'), 'patches', ['issue_id'], unique=False)

    # 3. regression_tests
    op.create_table(
        'regression_tests',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('analysis_run_id', sa.Integer(), nullable=False),
        sa.Column('repository_id', sa.Integer(), nullable=False),
        sa.Column('issue_id', sa.Integer(), nullable=True),
        sa.Column('mode', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=30), server_default='Generated', nullable=False),
        sa.Column('execution_status', sa.String(length=40), server_default='Generated — Not Executed', nullable=False),
        sa.Column('review_status', sa.String(length=30), server_default='Pending Review', nullable=False),
        sa.Column('test_file', sa.String(length=512), nullable=True),
        sa.Column('purpose', sa.Text(), nullable=True),
        sa.Column('reproduction_scenario', sa.Text(), nullable=True),
        sa.Column('expected_behavior', sa.Text(), nullable=True),
        sa.Column('test_code', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['analysis_run_id'], ['analysis_runs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['repository_id'], ['repositories.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['issue_id'], ['issues.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_regression_tests_id'), 'regression_tests', ['id'], unique=False)
    op.create_index(op.f('ix_regression_tests_analysis_run_id'), 'regression_tests', ['analysis_run_id'], unique=False)
    op.create_index(op.f('ix_regression_tests_repository_id'), 'regression_tests', ['repository_id'], unique=False)
    op.create_index(op.f('ix_regression_tests_issue_id'), 'regression_tests', ['issue_id'], unique=False)

    # 4. security_findings
    op.create_table(
        'security_findings',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('analysis_run_id', sa.Integer(), nullable=False),
        sa.Column('repository_id', sa.Integer(), nullable=False),
        sa.Column('issue_id', sa.Integer(), nullable=True),
        sa.Column('mode', sa.String(length=20), nullable=False),
        sa.Column('severity', sa.String(length=20), server_default='info', nullable=False),
        sa.Column('title', sa.String(length=512), nullable=False),
        sa.Column('detail', sa.Text(), nullable=True),
        sa.Column('affected_area', sa.String(length=512), nullable=True),
        sa.Column('blocking', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['analysis_run_id'], ['analysis_runs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['repository_id'], ['repositories.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['issue_id'], ['issues.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_security_findings_id'), 'security_findings', ['id'], unique=False)
    op.create_index(op.f('ix_security_findings_analysis_run_id'), 'security_findings', ['analysis_run_id'], unique=False)
    op.create_index(op.f('ix_security_findings_repository_id'), 'security_findings', ['repository_id'], unique=False)
    op.create_index(op.f('ix_security_findings_issue_id'), 'security_findings', ['issue_id'], unique=False)

    # 5. release_readiness
    op.create_table(
        'release_readiness',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('analysis_run_id', sa.Integer(), nullable=False),
        sa.Column('repository_id', sa.Integer(), nullable=False),
        sa.Column('issue_id', sa.Integer(), nullable=True),
        sa.Column('mode', sa.String(length=20), nullable=False),
        sa.Column('release_ready', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('status', sa.String(length=30), server_default='blocked', nullable=False),
        sa.Column('blocking_reasons', sa.JSON(), nullable=False),
        sa.Column('warnings', sa.JSON(), nullable=False),
        sa.Column('gate_checks', sa.JSON(), nullable=False),
        sa.Column('human_approval_required', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['analysis_run_id'], ['analysis_runs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['repository_id'], ['repositories.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['issue_id'], ['issues.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('analysis_run_id'),
    )
    op.create_index(op.f('ix_release_readiness_id'), 'release_readiness', ['id'], unique=False)
    op.create_index(op.f('ix_release_readiness_analysis_run_id'), 'release_readiness', ['analysis_run_id'], unique=True)
    op.create_index(op.f('ix_release_readiness_repository_id'), 'release_readiness', ['repository_id'], unique=False)
    op.create_index(op.f('ix_release_readiness_issue_id'), 'release_readiness', ['issue_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_release_readiness_issue_id'), table_name='release_readiness')
    op.drop_index(op.f('ix_release_readiness_repository_id'), table_name='release_readiness')
    op.drop_index(op.f('ix_release_readiness_analysis_run_id'), table_name='release_readiness')
    op.drop_index(op.f('ix_release_readiness_id'), table_name='release_readiness')
    op.drop_table('release_readiness')

    op.drop_index(op.f('ix_security_findings_issue_id'), table_name='security_findings')
    op.drop_index(op.f('ix_security_findings_repository_id'), table_name='security_findings')
    op.drop_index(op.f('ix_security_findings_analysis_run_id'), table_name='security_findings')
    op.drop_index(op.f('ix_security_findings_id'), table_name='security_findings')
    op.drop_table('security_findings')

    op.drop_index(op.f('ix_regression_tests_issue_id'), table_name='regression_tests')
    op.drop_index(op.f('ix_regression_tests_repository_id'), table_name='regression_tests')
    op.drop_index(op.f('ix_regression_tests_analysis_run_id'), table_name='regression_tests')
    op.drop_index(op.f('ix_regression_tests_id'), table_name='regression_tests')
    op.drop_table('regression_tests')

    op.drop_index(op.f('ix_patches_issue_id'), table_name='patches')
    op.drop_index(op.f('ix_patches_repository_id'), table_name='patches')
    op.drop_index(op.f('ix_patches_analysis_run_id'), table_name='patches')
    op.drop_index(op.f('ix_patches_id'), table_name='patches')
    op.drop_table('patches')

    op.drop_index(op.f('ix_analysis_runs_issue_id'), table_name='analysis_runs')
    op.drop_index(op.f('ix_analysis_runs_repository_id'), table_name='analysis_runs')
    op.drop_index(op.f('ix_analysis_runs_id'), table_name='analysis_runs')
    op.drop_table('analysis_runs')
