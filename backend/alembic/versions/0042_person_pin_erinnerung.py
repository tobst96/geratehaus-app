"""Person: Zeitpunkt der letzten PIN-Erinnerungsmail

Fügt `personen.pin_erinnerung_am` hinzu. Der periodische Job verschickt an
Personen ohne gesetzten PIN (und mit E-Mail) alle X Tage eine Self-Service-
Mail und merkt sich hier den letzten Versand.

Revision ID: 0042
Revises: 0041
Create Date: 2026-07-03 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0042"
down_revision = "0041"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "personen",
        sa.Column("pin_erinnerung_am", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("personen", "pin_erinnerung_am")
