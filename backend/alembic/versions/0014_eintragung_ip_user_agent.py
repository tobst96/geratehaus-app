"""Add eintragung_ip/eintragung_user_agent to track self check-ins ("Barcode vergessen")

Revision ID: 0014
Revises: 0013
Create Date: 2026-06-25 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("einsatz_personen", sa.Column("eintragung_ip", sa.String(64), nullable=True))
    op.add_column(
        "einsatz_personen", sa.Column("eintragung_user_agent", sa.String(512), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("einsatz_personen", "eintragung_user_agent")
    op.drop_column("einsatz_personen", "eintragung_ip")
