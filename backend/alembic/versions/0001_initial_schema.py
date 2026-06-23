"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-06-22

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _timestamps():
    return [
        sa.Column(
            "erstellt_am",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "aktualisiert_am",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    ]


def upgrade() -> None:
    op.create_table(
        "app_config",
        sa.Column("schluessel", sa.String(128), primary_key=True),
        sa.Column("wert", sa.Text(), nullable=False),
        sa.Column("typ", sa.String(32), nullable=False, server_default="str"),
        sa.Column("beschreibung", sa.Text(), nullable=True),
        *_timestamps(),
    )

    op.create_table(
        "personen",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False, unique=True),
        sa.Column("pin_hash", sa.String(255), nullable=True),
        sa.Column("pin_gesetzt", sa.Boolean(), nullable=False, server_default=sa.false()),
        *_timestamps(),
    )

    op.create_table(
        "fahrzeuge",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("buchbar", sa.Boolean(), nullable=False, server_default=sa.true()),
        *_timestamps(),
    )

    op.create_table(
        "funktionen_einsatz",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.true()),
        *_timestamps(),
    )

    op.create_table(
        "funktionen_dienststunden",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("schwellenwert_stunden", sa.Float(), nullable=False, server_default="0"),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.true()),
        *_timestamps(),
    )

    op.create_table(
        "moderatoren",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(255), nullable=False, unique=True),
        sa.Column("passwort_hash", sa.String(255), nullable=False),
        sa.Column("rolle", sa.String(64), nullable=False, server_default="admin"),
        *_timestamps(),
    )

    op.create_table(
        "einsaetze",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("titel", sa.String(255), nullable=False),
        sa.Column("quelle", sa.String(32), nullable=False, server_default="manuell"),
        sa.Column("divera_id", sa.String(64), nullable=True, unique=True),
        sa.Column("zeitpunkt", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="offen"),
        sa.Column("archiviert", sa.Boolean(), nullable=False, server_default=sa.false()),
        *_timestamps(),
    )

    op.create_table(
        "einsatz_personen",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "einsatz_id",
            sa.Integer(),
            sa.ForeignKey("einsaetze.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("person_id", sa.Integer(), sa.ForeignKey("personen.id"), nullable=False),
        sa.Column("fahrzeug_id", sa.Integer(), sa.ForeignKey("fahrzeuge.id"), nullable=True),
        sa.Column(
            "funktion_id", sa.Integer(), sa.ForeignKey("funktionen_einsatz.id"), nullable=True
        ),
        sa.Column("vab", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("atemschutzminuten", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("nur_geraetehaus", sa.Boolean(), nullable=False, server_default=sa.false()),
        *_timestamps(),
    )

    op.create_table(
        "dienstbuecher",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("titel", sa.Text(), nullable=False),
        sa.Column("eroeffnet_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("notizen", sa.Text(), nullable=True),
        sa.Column("archiviert", sa.Boolean(), nullable=False, server_default=sa.false()),
        *_timestamps(),
    )

    op.create_table(
        "dienstbuch_personen",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "dienstbuch_id",
            sa.Integer(),
            sa.ForeignKey("dienstbuecher.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("person_id", sa.Integer(), sa.ForeignKey("personen.id"), nullable=False),
        *_timestamps(),
    )

    op.create_table(
        "dienststunden",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("person_id", sa.Integer(), sa.ForeignKey("personen.id"), nullable=False),
        sa.Column(
            "funktion_id",
            sa.Integer(),
            sa.ForeignKey("funktionen_dienststunden.id"),
            nullable=False,
        ),
        sa.Column("stunden", sa.Float(), nullable=False),
        sa.Column("datum", sa.Date(), nullable=False),
        *_timestamps(),
    )

    op.create_table(
        "fahrzeug_buchungen",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("fahrzeug_id", sa.Integer(), sa.ForeignKey("fahrzeuge.id"), nullable=False),
        sa.Column("von", sa.DateTime(timezone=True), nullable=False),
        sa.Column("bis", sa.DateTime(timezone=True), nullable=False),
        sa.Column("zweck", sa.Text(), nullable=False),
        sa.Column(
            "verantwortliche_person_id",
            sa.Integer(),
            sa.ForeignKey("personen.id"),
            nullable=False,
        ),
        sa.Column("status", sa.String(32), nullable=False, server_default="ausstehend"),
        sa.Column("ablehnungsgrund", sa.Text(), nullable=True),
        sa.Column("hat_konflikt", sa.Boolean(), nullable=False, server_default=sa.false()),
        *_timestamps(),
    )

    op.create_table(
        "namens_abweichungen",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("cookie_name", sa.String(255), nullable=False),
        sa.Column("eingetragener_name", sa.String(255), nullable=False),
        sa.Column(
            "zeitstempel", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )


def downgrade() -> None:
    op.drop_table("namens_abweichungen")
    op.drop_table("fahrzeug_buchungen")
    op.drop_table("dienststunden")
    op.drop_table("dienstbuch_personen")
    op.drop_table("dienstbuecher")
    op.drop_table("einsatz_personen")
    op.drop_table("einsaetze")
    op.drop_table("moderatoren")
    op.drop_table("funktionen_dienststunden")
    op.drop_table("funktionen_einsatz")
    op.drop_table("fahrzeuge")
    op.drop_table("personen")
    op.drop_table("app_config")
