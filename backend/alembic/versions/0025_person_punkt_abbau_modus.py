"""Add abbau_modus column to person_punkte (Halten bis Ende / Abziehend bis Ende)

Revision ID: 0025
Revises: 0024
Create Date: 2026-06-26 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0025"
down_revision = "0024"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "person_punkte",
        sa.Column("abbau_modus", sa.String(16), nullable=False, server_default="halten"),
    )


def downgrade() -> None:
    op.drop_column("person_punkte", "abbau_modus")
