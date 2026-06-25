"""Add person_punkte table (Aktivitätspunkte mit Gültigkeit)

Revision ID: 0021
Revises: 0020
Create Date: 2026-06-25 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0021"
down_revision = "0020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "person_punkte",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("person_id", sa.Integer(), nullable=False),
        sa.Column("punkte", sa.Integer(), nullable=False),
        sa.Column("grund", sa.String(64), nullable=False),
        sa.Column("gueltig_bis", sa.Date(), nullable=False),
        sa.Column(
            "erstellt_am", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["person_id"], ["personen.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_person_punkte_person_id"), "person_punkte", ["person_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_person_punkte_person_id"), table_name="person_punkte")
    op.drop_table("person_punkte")
