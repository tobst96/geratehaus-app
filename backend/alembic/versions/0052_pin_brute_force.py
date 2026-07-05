"""Person: PIN-Brute-Force-Schutz (Fehlversuchszähler + temporäre Sperre)

Fügt der Tabelle `personen` zwei Felder hinzu, um Brute-Force auf den
öffentlichen Name+PIN-Login zu bremsen:
- `pin_fehlversuche`: Anzahl aufeinanderfolgender Fehlversuche seit dem letzten
  erfolgreichen Login bzw. seit der letzten Sperre.
- `pin_gesperrt_bis`: Zeitpunkt, bis zu dem der PIN-Login für diese Person
  gesperrt ist (NULL = nicht gesperrt). Nach Ablauf entsperrt sich die Person
  automatisch; ein Moderator kann zusätzlich manuell entsperren.

Revision ID: 0052
Revises: 0051
Create Date: 2026-07-05 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0052"
down_revision = "0051"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "personen",
        sa.Column("pin_fehlversuche", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "personen",
        sa.Column("pin_gesperrt_bis", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("personen", "pin_gesperrt_bis")
    op.drop_column("personen", "pin_fehlversuche")
