"""Convert JSON columns to JSONB (Postgres json has no equality operator,
which breaks SELECT DISTINCT on Einsatz rows including zusatzfelder)

Revision ID: 0007
Revises: 0006
Create Date: 2026-06-25 00:00:00.000000

"""
from alembic import op


revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE einsaetze ALTER COLUMN zusatzfelder TYPE jsonb USING zusatzfelder::jsonb")
    op.execute("ALTER TABLE fahrzeuge ALTER COLUMN sitzplaetze TYPE jsonb USING sitzplaetze::jsonb")


def downgrade() -> None:
    op.execute("ALTER TABLE einsaetze ALTER COLUMN zusatzfelder TYPE json USING zusatzfelder::json")
    op.execute("ALTER TABLE fahrzeuge ALTER COLUMN sitzplaetze TYPE json USING sitzplaetze::json")
