"""Add module table (Modul-Registry für Berechtigungssystem)

Revision ID: 0035
Revises: 0034
Create Date: 2026-07-02 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0035"
down_revision = "0034"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "module",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("beschreibung", sa.Text(), nullable=False, server_default=""),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "erstellt_am", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "aktualisiert_am",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_module_key", "module", ["key"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_module_key", table_name="module")
    op.drop_table("module")
