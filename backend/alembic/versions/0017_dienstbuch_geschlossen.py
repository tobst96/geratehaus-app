"""Add geschlossen to Dienstbuch for nightly auto-close

Revision ID: 0017
Revises: 0016
Create Date: 2026-06-25 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0017"
down_revision = "0016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "dienstbuecher",
        sa.Column("geschlossen", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("dienstbuecher", "geschlossen")
