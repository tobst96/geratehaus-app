"""Add issi column to fahrzeuge

Revision ID: 0034
Revises: 0033
Create Date: 2026-06-28 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0034"
down_revision = "0033"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("fahrzeuge", sa.Column("issi", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("fahrzeuge", "issi")
