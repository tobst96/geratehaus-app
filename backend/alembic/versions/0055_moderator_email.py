"""E-Mail-Adresse pro Moderatoren-Zugang

Fügt der Tabelle `moderatoren` ein optionales Feld `email` hinzu. Grundlage für
pro-Zugang-Benachrichtigungen und E-Mail-OTP-2FA (Etappe G / Etappe P4).

Revision ID: 0055
Revises: 0054
Create Date: 2026-07-06 08:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0055"
down_revision = "0054"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("moderatoren", sa.Column("email", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("moderatoren", "email")
