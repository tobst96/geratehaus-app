"""Moderator-Login-Brute-Force-Schutz (Fehlversuchszähler + temporäre Sperre)

Fügt der Tabelle `moderatoren` zwei Felder hinzu, um Brute-Force auf den
Moderator-Login zu bremsen (analog zum PIN-Login der Mitglieder):
- `login_fehlversuche`: aufeinanderfolgende Fehlversuche seit dem letzten Erfolg
  bzw. seit der letzten Sperre.
- `login_gesperrt_bis`: Zeitpunkt, bis zu dem der Login gesperrt ist (NULL = frei;
  nach Ablauf automatisch wieder frei).

Revision ID: 0054
Revises: 0053
Create Date: 2026-07-05 16:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0054"
down_revision = "0053"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "moderatoren",
        sa.Column("login_fehlversuche", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "moderatoren",
        sa.Column("login_gesperrt_bis", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("moderatoren", "login_gesperrt_bis")
    op.drop_column("moderatoren", "login_fehlversuche")
