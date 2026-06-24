"""Add Einsatz event log (timeline)

Revision ID: 0012
Revises: 0011
Create Date: 2026-06-29 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "einsatz_ereignisse",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("einsatz_id", sa.Integer(), nullable=False),
        sa.Column(
            "zeitpunkt", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("typ", sa.String(64), nullable=False),
        sa.Column("beschreibung", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["einsatz_id"], ["einsaetze.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_einsatz_ereignisse_einsatz_id"), "einsatz_ereignisse", ["einsatz_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_einsatz_ereignisse_einsatz_id"), table_name="einsatz_ereignisse")
    op.drop_table("einsatz_ereignisse")
