"""Audit-Log für sicherheitsrelevante Aktionen (Löschungen/Freigaben/Rechte)

Neue Tabelle `audit_logs`: modulübergreifendes Protokoll, wer wann welche
sicherheitsrelevante Aktion ausgelöst hat. Nur für Admins einsehbar. Bewusst
ohne Fremdschlüssel auf das betroffene Objekt (das kann bereits gelöscht sein).

Revision ID: 0053
Revises: 0052
Create Date: 2026-07-05 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0053"
down_revision = "0052"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "zeitpunkt",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("akteur", sa.String(255), nullable=False),
        sa.Column("aktion", sa.String(64), nullable=False),
        sa.Column("objekt_typ", sa.String(64), nullable=False),
        sa.Column("objekt_id", sa.Integer(), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
    )
    op.create_index("ix_audit_logs_zeitpunkt", "audit_logs", ["zeitpunkt"])


def downgrade() -> None:
    op.drop_index("ix_audit_logs_zeitpunkt", table_name="audit_logs")
    op.drop_table("audit_logs")
