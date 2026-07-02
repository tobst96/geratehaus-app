"""Add berechtigungen table (Modul-Zugriff pro Moderator)

Revision ID: 0036
Revises: 0035
Create Date: 2026-07-02 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0036"
down_revision = "0035"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "berechtigungen",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "moderator_id",
            sa.Integer(),
            sa.ForeignKey("moderatoren.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "modul_id",
            sa.Integer(),
            sa.ForeignKey("module.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "erstellt_am", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "aktualisiert_am",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("moderator_id", "modul_id", name="uq_berechtigung_moderator_modul"),
    )
    op.create_index("ix_berechtigungen_moderator_id", "berechtigungen", ["moderator_id"])
    op.create_index("ix_berechtigungen_modul_id", "berechtigungen", ["modul_id"])


def downgrade() -> None:
    op.drop_index("ix_berechtigungen_modul_id", table_name="berechtigungen")
    op.drop_index("ix_berechtigungen_moderator_id", table_name="berechtigungen")
    op.drop_table("berechtigungen")
