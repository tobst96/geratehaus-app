"""Pro-Moderator-Opt-in für Admin-/Betriebs-Benachrichtigungen

Fügt `moderatoren.benachrichtigungen_aktiv` hinzu (Default false). Ersetzt die
rein globale Empfängerliste `notifier_email_recipients` schrittweise: Admin-Mails
(Buchungsanfrage-Aktionen, Backup-Status) gehen künftig an Moderatoren, die das
aktiviert haben – zusätzlich zur bestehenden globalen Liste (non-breaking).

Revision ID: 0058
Revises: 0057
Create Date: 2026-07-07 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0058"
down_revision = "0057"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "moderatoren",
        sa.Column(
            "benachrichtigungen_aktiv", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
    )


def downgrade() -> None:
    op.drop_column("moderatoren", "benachrichtigungen_aktiv")
