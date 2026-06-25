"""Add person_bild_reservierungen table (Profilbild per QR-Code-Upload)

Revision ID: 0022
Revises: 0021
Create Date: 2026-06-25 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0022"
down_revision = "0021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "person_bild_reservierungen",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(64), nullable=False),
        sa.Column("person_id", sa.Integer(), nullable=False),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ablauf_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("eingeloest", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["person_id"], ["personen.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token"),
    )
    op.create_index(
        op.f("ix_person_bild_reservierungen_token"),
        "person_bild_reservierungen",
        ["token"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_person_bild_reservierungen_token"), table_name="person_bild_reservierungen"
    )
    op.drop_table("person_bild_reservierungen")
