"""Add vorschau_person_id to SitzplatzReservierung; add dienstbuch_reservierungen table

Revision ID: 0018
Revises: 0017
Create Date: 2026-06-25 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0018"
down_revision = "0017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "sitzplatz_reservierungen",
        sa.Column("vorschau_person_id", sa.Integer(), sa.ForeignKey("personen.id"), nullable=True),
    )

    op.create_table(
        "dienstbuch_reservierungen",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(64), nullable=False),
        sa.Column("dienstbuch_id", sa.Integer(), nullable=False),
        sa.Column("vorschau_person_id", sa.Integer(), nullable=True),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ablauf_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("eingeloest", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["dienstbuch_id"], ["dienstbuecher.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["vorschau_person_id"], ["personen.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token"),
    )
    op.create_index(
        op.f("ix_dienstbuch_reservierungen_token"), "dienstbuch_reservierungen", ["token"], unique=True
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_dienstbuch_reservierungen_token"), table_name="dienstbuch_reservierungen")
    op.drop_table("dienstbuch_reservierungen")
    op.drop_column("sitzplatz_reservierungen", "vorschau_person_id")
