"""Kein PIN gesetzt: Eintragung/Anfrage trotzdem möglich, aber gekennzeichnet.

Analog zum bestehenden ohne_barcode (nur Einsatztagebuch) – hier für alle
vier Kiosk-Module, deren Fehlen bisher die Identifikation per Name+PIN
komplett blockierte (siehe stammdaten_service.pin_login_erzwingen).

Revision ID: 0069
Revises: 0068
Create Date: 2026-08-17 00:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

revision = "0069"
down_revision = "0068"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "einsatz_personen",
        sa.Column("ohne_pin", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "dienstbuch_personen",
        sa.Column("ohne_pin", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "dienststunden",
        sa.Column("ohne_pin", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "fahrzeug_buchungen",
        sa.Column("ohne_pin", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("fahrzeug_buchungen", "ohne_pin")
    op.drop_column("dienststunden", "ohne_pin")
    op.drop_column("dienstbuch_personen", "ohne_pin")
    op.drop_column("einsatz_personen", "ohne_pin")
