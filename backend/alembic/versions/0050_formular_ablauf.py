"""Formular: Ablaufdatum + Zusammenfassungs-Marker

Ergänzt die Tabelle `formulare` um:
- `ablauf_am`: optionales Ablaufdatum (NULL = dauerhaft gültig). Nach Ablauf ist
  das Formular nicht mehr absendbar.
- `zusammenfassung_gesendet_am`: Zeitpunkt, zu dem die Ablauf-Zusammenfassung per
  Mail verschickt wurde (verhindert Doppelversand durch den Hintergrund-Job).

Revision ID: 0050
Revises: 0049
Create Date: 2026-07-04 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0050"
down_revision = "0049"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("formulare", sa.Column("ablauf_am", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "formulare",
        sa.Column("zusammenfassung_gesendet_am", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("formulare", "zusammenfassung_gesendet_am")
    op.drop_column("formulare", "ablauf_am")
