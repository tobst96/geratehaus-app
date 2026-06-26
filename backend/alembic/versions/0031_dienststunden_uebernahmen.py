"""Add dienststunden_uebernahmen table (Stunden-Übernahme bei Schwellenwert-Überschreitung)

Revision ID: 0031
Revises: 0030
Create Date: 2026-06-27 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0031"
down_revision = "0030"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "dienststunden_uebernahmen",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "person_id",
            sa.Integer(),
            sa.ForeignKey("personen.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "funktion_id",
            sa.Integer(),
            sa.ForeignKey("funktionen_dienststunden.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("stunden", sa.Float(), nullable=False),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "aktualisiert_am", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index(
        "ix_dienststunden_uebernahmen_person_id", "dienststunden_uebernahmen", ["person_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_dienststunden_uebernahmen_person_id", table_name="dienststunden_uebernahmen")
    op.drop_table("dienststunden_uebernahmen")
