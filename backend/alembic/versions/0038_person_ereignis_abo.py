"""Add person_ereignis_abos (Ereignis-Abos pro Person)

Revision ID: 0038
Revises: 0037
Create Date: 2026-07-02 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0038"
down_revision = "0037"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "person_ereignis_abos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "person_id",
            sa.Integer(),
            sa.ForeignKey("personen.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("ereignis", sa.String(length=64), nullable=False),
        sa.Column(
            "erstellt_am", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "aktualisiert_am",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("person_id", "ereignis", name="uq_ereignis_abo_person_ereignis"),
    )
    op.create_index("ix_person_ereignis_abos_person_id", "person_ereignis_abos", ["person_id"])


def downgrade() -> None:
    op.drop_index("ix_person_ereignis_abos_person_id", table_name="person_ereignis_abos")
    op.drop_table("person_ereignis_abos")
