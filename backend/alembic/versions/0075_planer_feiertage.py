"""Dienstbuch Planer Phase 2: manuell gepflegte Feiertage (zusätzlich zu den
aus dem Regelwerk backend/app/data/feiertage_regeln.json berechneten).

Revision ID: 0075
Revises: 0074
Create Date: 2026-08-25 00:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

revision = "0075"
down_revision = "0074"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "planer_feiertage",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("datum", sa.Date(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "aktualisiert_am", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_planer_feiertage_datum", "planer_feiertage", ["datum"])


def downgrade() -> None:
    op.drop_index("ix_planer_feiertage_datum", table_name="planer_feiertage")
    op.drop_table("planer_feiertage")
