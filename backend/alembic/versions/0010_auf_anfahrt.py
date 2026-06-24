"""Add 'auf Anfahrt gewesen' check-in option alongside 'nur Geraetehaus'

Revision ID: 0010
Revises: 0009
Create Date: 2026-06-28 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "einsatz_personen",
        sa.Column("auf_anfahrt", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("einsatz_personen", "auf_anfahrt")
