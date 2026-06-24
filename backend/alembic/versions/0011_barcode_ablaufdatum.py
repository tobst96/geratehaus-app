"""Add expiry date to barcode tokens

Revision ID: 0011
Revises: 0010
Create Date: 2026-06-29 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("barcode_tokens", sa.Column("ablauf_am", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("barcode_tokens", "ablauf_am")
