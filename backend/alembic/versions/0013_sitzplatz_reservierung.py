"""Add seat reservation tokens (QR/"Barcode vergessen") and ohne_barcode flag

Revision ID: 0013
Revises: 0012
Create Date: 2026-06-30 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "einsatz_personen",
        sa.Column("ohne_barcode", sa.Boolean(), nullable=False, server_default="false"),
    )

    op.create_table(
        "sitzplatz_reservierungen",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(64), nullable=False),
        sa.Column("einsatz_id", sa.Integer(), nullable=False),
        sa.Column("fahrzeug_id", sa.Integer(), nullable=True),
        sa.Column("sitzplatz_id", sa.String(64), nullable=True),
        sa.Column("bezeichnung", sa.String(255), nullable=False),
        sa.Column("nur_geraetehaus", sa.Boolean(), nullable=False),
        sa.Column("auf_anfahrt", sa.Boolean(), nullable=False),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ablauf_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("eingeloest", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["einsatz_id"], ["einsaetze.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["fahrzeug_id"], ["fahrzeuge.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token"),
    )
    op.create_index(
        op.f("ix_sitzplatz_reservierungen_token"), "sitzplatz_reservierungen", ["token"], unique=True
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_sitzplatz_reservierungen_token"), table_name="sitzplatz_reservierungen")
    op.drop_table("sitzplatz_reservierungen")
    op.drop_column("einsatz_personen", "ohne_barcode")
