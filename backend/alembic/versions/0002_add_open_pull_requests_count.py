"""Add open_pull_requests_count to repositories table.

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-21 14:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'repositories',
        sa.Column('open_pull_requests_count', sa.Integer(), server_default='0', nullable=False),
    )


def downgrade() -> None:
    op.drop_column('repositories', 'open_pull_requests_count')
