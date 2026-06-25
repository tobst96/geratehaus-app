"""Add default Funktion to Person and Person event log (timeline)

Revision ID: 0020
Revises: 0019
Create Date: 2026-06-25 17:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0020"
down_revision = "0019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("personen", sa.Column("funktion_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_personen_funktion_id",
        "personen",
        "funktionen_dienststunden",
        ["funktion_id"],
        ["id"],
    )

    op.create_table(
        "person_ereignisse",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("person_id", sa.Integer(), nullable=False),
        sa.Column(
            "zeitpunkt", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("typ", sa.String(64), nullable=False),
        sa.Column("beschreibung", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["person_id"], ["personen.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_person_ereignisse_person_id"), "person_ereignisse", ["person_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_person_ereignisse_person_id"), table_name="person_ereignisse")
    op.drop_table("person_ereignisse")
    op.drop_constraint("fk_personen_funktion_id", "personen", type_="foreignkey")
    op.drop_column("personen", "funktion_id")
