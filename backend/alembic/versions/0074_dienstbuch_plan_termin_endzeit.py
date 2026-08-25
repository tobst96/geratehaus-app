"""Dienstbuch Planer: optionale Endzeit am Termin (z. B. 19:00-21:00).

Revision ID: 0074
Revises: 0073
Create Date: 2026-08-25 00:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

revision = "0074"
down_revision = "0073"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("dienstbuch_plan_termine", sa.Column("endzeit", sa.Time(), nullable=True))


def downgrade() -> None:
    op.drop_column("dienstbuch_plan_termine", "endzeit")
