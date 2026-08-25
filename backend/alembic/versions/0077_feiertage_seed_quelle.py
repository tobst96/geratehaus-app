"""Planer-Feiertage: Umbau auf einmaliges DB-Seeding (Nutzerwunsch: auch
gesetzliche Feiertage müssen löschbar sein). Neue Spalte `quelle`
("regel" = beim Start aus dem Regelwerk geseedet, "manuell" = von Hand
angelegt) - alle Zeilen sind gleichberechtigt löschbar.

Revision ID: 0077
Revises: 0076
Create Date: 2026-08-25 00:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

revision = "0077"
down_revision = "0076"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "planer_feiertage",
        sa.Column("quelle", sa.String(length=16), nullable=False, server_default="manuell"),
    )


def downgrade() -> None:
    op.drop_column("planer_feiertage", "quelle")
