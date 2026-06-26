"""Add fahrzeugbuchung_reservierungen table ("Barcode vergessen" für Buchungen)

Revision ID: 0026
Revises: 0025
Create Date: 2026-06-26 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0026"
down_revision = "0025"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "fahrzeugbuchung_reservierungen",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(64), nullable=False),
        sa.Column("vorschau_person_id", sa.Integer(), nullable=True),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ablauf_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("eingeloest", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["vorschau_person_id"], ["personen.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token"),
    )
    op.create_index(
        op.f("ix_fahrzeugbuchung_reservierungen_token"),
        "fahrzeugbuchung_reservierungen",
        ["token"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_fahrzeugbuchung_reservierungen_token"), table_name="fahrzeugbuchung_reservierungen"
    )
    op.drop_table("fahrzeugbuchung_reservierungen")
