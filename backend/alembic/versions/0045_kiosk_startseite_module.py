"""Kiosk-Token: Startseiten-Module pro Kiosk-Link

Fügt der Tabelle `kiosk_tokens` das Feld `startseite_module` (JSONB, Liste von
Modul-Keys) hinzu. Ist es NULL, gilt weiterhin die globale Einstellung
`modul_<key>_startseite`; ist eine Liste gesetzt, entscheidet sie pro Kiosk-Link,
welche Module auf der Kiosk-Startseite erscheinen.

Revision ID: 0045
Revises: 0044
Create Date: 2026-07-03 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0045"
down_revision = "0044"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "kiosk_tokens",
        sa.Column("startseite_module", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("kiosk_tokens", "startseite_module")
