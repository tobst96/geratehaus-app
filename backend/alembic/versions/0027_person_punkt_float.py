"""Allow fractional points in person_punkte.punkte (Integer -> Float)

Revision ID: 0027
Revises: 0026
Create Date: 2026-06-26 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0027"
down_revision = "0026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "person_punkte",
        "punkte",
        existing_type=sa.Integer(),
        type_=sa.Float(),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "person_punkte",
        "punkte",
        existing_type=sa.Float(),
        type_=sa.Integer(),
        existing_nullable=False,
    )
