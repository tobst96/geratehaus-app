"""Add kiosk_tokens table (Kiosk-Modus pro Gerät statt Startseite)

Revision ID: 0028
Revises: 0027
Create Date: 2026-06-26 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0028"
down_revision = "0027"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "kiosk_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("bezeichnung", sa.String(255), nullable=False),
        sa.Column("token", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token"),
    )
    op.create_index(op.f("ix_kiosk_tokens_token"), "kiosk_tokens", ["token"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_kiosk_tokens_token"), table_name="kiosk_tokens")
    op.drop_table("kiosk_tokens")
