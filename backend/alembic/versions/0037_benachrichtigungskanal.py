"""Add benachrichtigungskanaele table (Kanal pro Person)

Revision ID: 0037
Revises: 0036
Create Date: 2026-07-02 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0037"
down_revision = "0036"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "benachrichtigungskanaele",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "person_id",
            sa.Integer(),
            sa.ForeignKey("personen.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("typ", sa.String(length=32), nullable=False),
        sa.Column("zielwert", sa.String(length=255), nullable=False, server_default=""),
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
        sa.UniqueConstraint("person_id", "typ", name="uq_kanal_person_typ"),
    )
    op.create_index(
        "ix_benachrichtigungskanaele_person_id", "benachrichtigungskanaele", ["person_id"]
    )


def downgrade() -> None:
    op.drop_index(
        "ix_benachrichtigungskanaele_person_id", table_name="benachrichtigungskanaele"
    )
    op.drop_table("benachrichtigungskanaele")
