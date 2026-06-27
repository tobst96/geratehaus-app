"""Add divera_user_id to personen + divera_vorschlaege table (Divera-Personal-Abgleich)

Revision ID: 0033
Revises: 0032
Create Date: 2026-06-27 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0033"
down_revision = "0032"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("personen", sa.Column("divera_user_id", sa.String(64), nullable=True))
    op.create_index(
        "ix_personen_divera_user_id", "personen", ["divera_user_id"], unique=True
    )

    op.create_table(
        "divera_vorschlaege",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("divera_user_id", sa.String(64), nullable=False),
        sa.Column("art", sa.String(32), nullable=False),
        sa.Column("vorschlag_daten", sa.JSON(), nullable=False),
        sa.Column(
            "bestehende_person_id",
            sa.Integer(),
            sa.ForeignKey("personen.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("status", sa.String(32), nullable=False, server_default="offen"),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("entschieden_am", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_divera_vorschlaege_divera_user_id_art",
        "divera_vorschlaege",
        ["divera_user_id", "art"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_divera_vorschlaege_divera_user_id_art", table_name="divera_vorschlaege")
    op.drop_table("divera_vorschlaege")
    op.drop_index("ix_personen_divera_user_id", table_name="personen")
    op.drop_column("personen", "divera_user_id")
