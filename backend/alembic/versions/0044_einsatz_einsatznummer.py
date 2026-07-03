"""Einsatz: Einsatznummer (u. a. für Divera-Import)

Fügt der Tabelle `einsaetze` das Feld `einsatznummer` hinzu, damit aus Divera
importierte Alarme zusätzlich zur Adresse und Meldung auch die Einsatznummer
der Leitstelle behalten.

Revision ID: 0044
Revises: 0043
Create Date: 2026-07-03 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0044"
down_revision = "0043"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("einsaetze", sa.Column("einsatznummer", sa.String(64), nullable=True))


def downgrade() -> None:
    op.drop_column("einsaetze", "einsatznummer")
