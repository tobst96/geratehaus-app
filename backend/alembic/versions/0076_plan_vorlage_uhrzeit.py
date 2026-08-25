"""Dienstbuch Planer: Beginn-/Endzeit an der Wiederholungsvorlage - generierte
Jahres-Termine erben die Zeiten (z. B. Übungsdienst immer 19:00-21:00).

Revision ID: 0076
Revises: 0075
Create Date: 2026-08-25 00:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

revision = "0076"
down_revision = "0075"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("dienstbuch_plan_vorlagen", sa.Column("uhrzeit", sa.Time(), nullable=True))
    op.add_column("dienstbuch_plan_vorlagen", sa.Column("endzeit", sa.Time(), nullable=True))


def downgrade() -> None:
    op.drop_column("dienstbuch_plan_vorlagen", "endzeit")
    op.drop_column("dienstbuch_plan_vorlagen", "uhrzeit")
