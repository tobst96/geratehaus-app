"""Add barcode and fahrzeug tokens

Revision ID: 0003
Revises: 0002_push_subscriptions
Create Date: 2025-06-23 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "barcode_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("person_id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["person_id"], ["personen.id"], ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token"),
    )
    op.create_index(op.f("ix_barcode_tokens_token"), "barcode_tokens", ["token"], unique=False)

    op.create_table(
        "fahrzeug_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("fahrzeug_id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["fahrzeug_id"], ["fahrzeuge.id"], ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token"),
    )
    op.create_index(op.f("ix_fahrzeug_tokens_token"), "fahrzeug_tokens", ["token"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_fahrzeug_tokens_token"), table_name="fahrzeug_tokens")
    op.drop_table("fahrzeug_tokens")
    op.drop_index(op.f("ix_barcode_tokens_token"), table_name="barcode_tokens")
    op.drop_table("barcode_tokens")
