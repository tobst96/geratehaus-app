"""Add Gruppe (Personen-Gruppe) plus Dienstbuch-Teilnehmer gruppe_id/atemschutzminuten

Revision ID: 0016
Revises: 0015
Create Date: 2026-06-25 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0016"
down_revision = "0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "gruppen",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "erstellt_am", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "aktualisiert_am",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.add_column(
        "personen", sa.Column("gruppe_id", sa.Integer(), sa.ForeignKey("gruppen.id"), nullable=True)
    )
    op.add_column(
        "dienstbuch_personen",
        sa.Column("gruppe_id", sa.Integer(), sa.ForeignKey("gruppen.id"), nullable=True),
    )
    op.add_column(
        "dienstbuch_personen",
        sa.Column("atemschutzminuten", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("dienstbuch_personen", "atemschutzminuten")
    op.drop_column("dienstbuch_personen", "gruppe_id")
    op.drop_column("personen", "gruppe_id")
    op.drop_table("gruppen")
