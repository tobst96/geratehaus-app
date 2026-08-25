"""Dienstbuch Planer: optionale Uhrzeit am Termin (für Drag&Drop/manuelle
Terminierung von Platzhaltern mit Zeitangabe).

Revision ID: 0073
Revises: 0072
Create Date: 2026-08-25 00:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

revision = "0073"
down_revision = "0072"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("dienstbuch_plan_termine", sa.Column("uhrzeit", sa.Time(), nullable=True))


def downgrade() -> None:
    op.drop_column("dienstbuch_plan_termine", "uhrzeit")
