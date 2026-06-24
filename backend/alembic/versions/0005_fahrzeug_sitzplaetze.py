"""Add vehicle seat layout (Sitzplätze) and seat assignment on participation

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-24 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "fahrzeuge",
        sa.Column("sitzplaetze", sa.JSON(), nullable=False, server_default="[]"),
    )
    op.add_column(
        "einsatz_personen",
        sa.Column("sitzplatz_id", sa.String(64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("einsatz_personen", "sitzplatz_id")
    op.drop_column("fahrzeuge", "sitzplaetze")
