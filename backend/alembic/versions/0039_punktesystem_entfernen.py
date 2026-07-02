"""Punktesystem entfernen: person_punkte-Tabelle droppen

Das Aktivitätspunkte-System wurde vollständig aus der Anwendung entfernt
(Modelle, Services, Endpunkte, Frontend, Config-Keys). Diese Migration entfernt
die zugehörige Tabelle. Der Downgrade stellt sie im zuletzt gültigen Schema
wieder her (float-Punkte inkl. abbau_modus), aber ohne die früheren Inhalte.

Revision ID: 0039
Revises: 0038
Create Date: 2026-07-02 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0039"
down_revision = "0038"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index(op.f("ix_person_punkte_person_id"), table_name="person_punkte")
    op.drop_table("person_punkte")


def downgrade() -> None:
    op.create_table(
        "person_punkte",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("person_id", sa.Integer(), nullable=False),
        sa.Column("punkte", sa.Float(), nullable=False),
        sa.Column("grund", sa.String(64), nullable=False),
        sa.Column("gueltig_bis", sa.Date(), nullable=False),
        sa.Column(
            "erstellt_am", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("abbau_modus", sa.String(16), nullable=False, server_default="halten"),
        sa.ForeignKeyConstraint(["person_id"], ["personen.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_person_punkte_person_id"), "person_punkte", ["person_id"], unique=False
    )
