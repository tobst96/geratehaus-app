"""Token-Invalidierung bei Passwortänderung/2FA-Reset (Gruppenführer/Admin).

Neue Spalte `sicherheit_geaendert_am` auf `personen`: Zeitpunkt der letzten
sicherheitsrelevanten Änderung (Passwort gesetzt/geändert oder 2FA
zurückgesetzt/deaktiviert). Wird als Claim im Gruppenführer-JWT geführt und bei
jedem authentifizierten Request gegen den aktuellen DB-Wert geprüft - so
überlebt ein gestohlenes Token keine Passwortänderung/keinen 2FA-Reset mehr
(vorher blieb es bis zum regulären Ablauf gültig, siehe `jwt_expire_minutes`).

Bewusst NULL als Default (kein Backfill): bestehende, bereits ausgestellte
Tokens tragen noch keinen Claim (Payload ohne den Schlüssel -> `None`) und
bleiben bis zum nächsten Passwort-/2FA-Ereignis gültig - kein erzwungenes
Massen-Logout direkt nach diesem Deployment.

Revision ID: 0078
Revises: 0077
Create Date: 2026-08-25 00:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

revision = "0078"
down_revision = "0077"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "personen",
        sa.Column("sicherheit_geaendert_am", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("personen", "sicherheit_geaendert_am")
