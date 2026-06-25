"""Add geplanter_abschluss_am to Einsatz for "Alle eingetragen" delayed close

Revision ID: 0015
Revises: 0014
Create Date: 2026-06-25 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "einsaetze", sa.Column("geplanter_abschluss_am", sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("einsaetze", "geplanter_abschluss_am")
