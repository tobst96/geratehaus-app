"""Personen-Verlauf: handelnden Akteur (Gruppenführer/Admin) protokollieren.

`PersonEreignis` kannte bisher nur das "was" (typ/beschreibung), nicht das
"wer". Neue, nullable Spalte `akteur_name` – bestehende Einträge bleiben
gültig und zeigen weiterhin keinen Akteur (Frontend behandelt NULL als
"unbekannt"/leer). Nur dort befüllt, wo ein handelnder Gruppenführer/Admin
tatsächlich vorhanden ist (Selbst-/Systemereignisse bleiben bewusst ohne
Akteur, siehe Backlog Etappe T).

Revision ID: 0071
Revises: 0070
Create Date: 2026-08-24 00:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

revision = "0071"
down_revision = "0070"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "person_ereignisse",
        sa.Column("akteur_name", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("person_ereignisse", "akteur_name")
