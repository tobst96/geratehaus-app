"""Backup-Metadaten (Modul „Backup")

Legt die Tabelle `backups` an – Metadaten je erzeugtem Backup für den
Backup-Browser (die verschlüsselte Datei selbst liegt in den Zielen).

Revision ID: 0046
Revises: 0045
Create Date: 2026-07-04 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0046"
down_revision = "0045"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "backups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("dateiname", sa.String(255), nullable=False),
        sa.Column("groesse_bytes", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("ziele", sa.String(255), nullable=False, server_default=""),
        sa.Column("ausloeser", sa.String(32), nullable=False, server_default="manuell"),
        sa.Column("status", sa.String(16), nullable=False, server_default="ok"),
        sa.Column("fehlermeldung", sa.Text(), nullable=True),
        sa.Column("verschluesselt", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "zusammenfassung",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("aktualisiert_am", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_backups_dateiname", "backups", ["dateiname"])


def downgrade() -> None:
    op.drop_index("ix_backups_dateiname", table_name="backups")
    op.drop_table("backups")
