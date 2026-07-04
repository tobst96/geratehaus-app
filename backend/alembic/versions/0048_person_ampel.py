"""Person: Ampel-Felder (inaktiv, ampel_gemeldet)

Fügt der Tabelle `personen` zwei Felder für das Aktivitäts-Ampelsystem hinzu:
- `inaktiv`: manuell gesetzt (z. B. Beurlaubung) – solche Personen bekommen keine
  Ampel-Färbung und keine Ampel-Benachrichtigung und werden von der automatischen
  Inaktivitäts-Löschung ausgenommen.
- `ampel_gemeldet`: zuletzt per Benachrichtigung gemeldete Ampelstufe
  (gruen/gelb/rot), damit die Benachrichtigung nur EINMAL beim Überschreiten einer
  Schwelle ausgelöst wird und nicht täglich erneut.

Revision ID: 0048
Revises: 0047
Create Date: 2026-07-04 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0048"
down_revision = "0047"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "personen",
        sa.Column("inaktiv", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "personen",
        sa.Column("ampel_gemeldet", sa.String(10), nullable=False, server_default="gruen"),
    )


def downgrade() -> None:
    op.drop_column("personen", "ampel_gemeldet")
    op.drop_column("personen", "inaktiv")
