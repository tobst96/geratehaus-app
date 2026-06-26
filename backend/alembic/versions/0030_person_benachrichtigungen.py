"""Add benachrichtigungen_aktiv column to personen (per-Person Notifications)

Revision ID: 0030
Revises: 0029
Create Date: 2026-06-26 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0030"
down_revision = "0029"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "personen",
        sa.Column("benachrichtigungen_aktiv", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("personen", "benachrichtigungen_aktiv")
