"""Add structured name parts and profile picture to Person

Revision ID: 0008
Revises: 0007
Create Date: 2026-06-26 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("personen", sa.Column("vorname", sa.String(128), nullable=True))
    op.add_column("personen", sa.Column("zwischenname", sa.String(128), nullable=True))
    op.add_column("personen", sa.Column("nachname", sa.String(128), nullable=True))
    op.add_column("personen", sa.Column("bild_url", sa.String(512), nullable=True))


def downgrade() -> None:
    op.drop_column("personen", "bild_url")
    op.drop_column("personen", "nachname")
    op.drop_column("personen", "zwischenname")
    op.drop_column("personen", "vorname")
