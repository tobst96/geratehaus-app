"""Add buchung_aktion_tokens table (Annehmen/Ablehnen per Mail-Link ohne Login)

Revision ID: 0032
Revises: 0031
Create Date: 2026-06-27 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0032"
down_revision = "0031"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "buchung_aktion_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "buchung_id",
            sa.Integer(),
            sa.ForeignKey("fahrzeug_buchungen.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token", sa.String(64), nullable=False),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ablauf_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("eingeloest", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index(
        "ix_buchung_aktion_tokens_token", "buchung_aktion_tokens", ["token"], unique=True
    )


def downgrade() -> None:
    op.drop_index("ix_buchung_aktion_tokens_token", table_name="buchung_aktion_tokens")
    op.drop_table("buchung_aktion_tokens")
