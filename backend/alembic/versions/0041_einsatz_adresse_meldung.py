"""Einsatz: Adresse und Meldung (u. a. für Divera-Import)

Fügt der Tabelle `einsaetze` die Felder `adresse` und `meldung` hinzu, damit
aus Divera importierte Alarme ihre Einsatzadresse und den ausführlichen
Meldungstext behalten (zusätzlich zum kurzen Stichwort im `titel`).

Revision ID: 0041
Revises: 0040
Create Date: 2026-07-02 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0041"
down_revision = "0040"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("einsaetze", sa.Column("adresse", sa.String(512), nullable=True))
    op.add_column("einsaetze", sa.Column("meldung", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("einsaetze", "meldung")
    op.drop_column("einsaetze", "adresse")
