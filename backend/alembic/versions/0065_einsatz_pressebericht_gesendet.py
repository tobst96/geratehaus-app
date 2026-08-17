"""Add einsaetze.pressebericht_gesendet_am (Idempotenz-Marker für das Modul Pressebericht).

Merkt, wann für einen Einsatz bereits ein Pressebericht versendet wurde, damit
die zeitgesteuerten Versandmodi (nach X Stunden / um Uhrzeit) einen Einsatz nur
einmal berücksichtigen.
"""

import sqlalchemy as sa
from alembic import op

revision = "0065"
down_revision = "0064"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "einsaetze",
        sa.Column("pressebericht_gesendet_am", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("einsaetze", "pressebericht_gesendet_am")
