"""Formular-Ausbau: Zeitfenster, Kapazität, Consent, Danke/Ergebnis, Feld-Hinweis

Ergänzt `formulare` um Start-/Kapazitäts-/Aufbewahrungs-/Danke-/Consent-Felder und
`formular_felder` um einen optionalen Hilfetext (`hinweis`). Neue Feldtypen
(datum/zahl/email/telefon/ja_nein/skala/datei) brauchen kein neues DB-Feld.

Revision ID: 0051
Revises: 0050
Create Date: 2026-07-04 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0051"
down_revision = "0050"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("formulare", sa.Column("start_am", sa.DateTime(timezone=True), nullable=True))
    op.add_column("formulare", sa.Column("max_einreichungen", sa.Integer(), nullable=True))
    op.add_column("formulare", sa.Column("aufbewahrung_tage", sa.Integer(), nullable=True))
    op.add_column("formulare", sa.Column("danke_text", sa.Text(), nullable=True))
    op.add_column(
        "formulare",
        sa.Column("ergebnis_oeffentlich", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("formulare", sa.Column("einwilligung_text", sa.Text(), nullable=True))
    op.add_column(
        "formulare",
        sa.Column("mehrfach_verhindern", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("formular_felder", sa.Column("hinweis", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("formular_felder", "hinweis")
    op.drop_column("formulare", "mehrfach_verhindern")
    op.drop_column("formulare", "einwilligung_text")
    op.drop_column("formulare", "ergebnis_oeffentlich")
    op.drop_column("formulare", "danke_text")
    op.drop_column("formulare", "aufbewahrung_tage")
    op.drop_column("formulare", "max_einreichungen")
    op.drop_column("formulare", "start_am")
