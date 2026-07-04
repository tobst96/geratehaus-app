"""Modul „Formular": Formulare, Felder und Einreichungen

Legt die drei Tabellen für das neue Formular-Modul an:
- `formulare`: konfigurierbare Formulare (Name, Beschreibung, aktiv, Login-Pflicht,
  E-Mail-Empfänger, Moderator-Sichtbarkeit).
- `formular_felder`: Felder je Formular (Typ, Pflicht, Dropdown-Optionen, max. Sterne).
- `formular_einreichungen`: abgesendete Antworten (Snapshot als JSONB), optional
  einer Person zugeordnet.

Revision ID: 0049
Revises: 0048
Create Date: 2026-07-04 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0049"
down_revision = "0048"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "formulare",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("beschreibung", sa.Text(), nullable=True),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("login_erforderlich", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("email_empfaenger", sa.String(255), nullable=True),
        sa.Column("moderator_sichtbar", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("reihenfolge", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("aktualisiert_am", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "formular_felder",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("formular_id", sa.Integer(), sa.ForeignKey("formulare.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(255), nullable=False),
        sa.Column("typ", sa.String(32), nullable=False, server_default="text"),
        sa.Column("pflicht", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("optionen", JSONB(), nullable=False, server_default="[]"),
        sa.Column("max_sterne", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("reihenfolge", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("aktualisiert_am", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_formular_felder_formular_id", "formular_felder", ["formular_id"])
    op.create_table(
        "formular_einreichungen",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("formular_id", sa.Integer(), sa.ForeignKey("formulare.id", ondelete="CASCADE"), nullable=False),
        sa.Column("person_id", sa.Integer(), sa.ForeignKey("personen.id", ondelete="SET NULL"), nullable=True),
        sa.Column("antworten", JSONB(), nullable=False, server_default="[]"),
        sa.Column("ip", sa.String(64), nullable=True),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("aktualisiert_am", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_formular_einreichungen_formular_id", "formular_einreichungen", ["formular_id"])


def downgrade() -> None:
    op.drop_index("ix_formular_einreichungen_formular_id", table_name="formular_einreichungen")
    op.drop_table("formular_einreichungen")
    op.drop_index("ix_formular_felder_formular_id", table_name="formular_felder")
    op.drop_table("formular_felder")
    op.drop_table("formulare")
