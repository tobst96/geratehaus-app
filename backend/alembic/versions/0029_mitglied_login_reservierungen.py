"""Add mitglied_login_reservierungen table ("Barcode vergessen" für Mitglieder-Login)

Revision ID: 0029
Revises: 0028
Create Date: 2026-06-26 16:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0029"
down_revision = "0028"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "mitglied_login_reservierungen",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(64), nullable=False),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ablauf_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("person_id", sa.Integer(), nullable=True),
        sa.Column("bestaetigt", sa.Boolean(), nullable=False),
        sa.Column("eingeloest", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["person_id"], ["personen.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token"),
    )
    op.create_index(
        op.f("ix_mitglied_login_reservierungen_token"),
        "mitglied_login_reservierungen",
        ["token"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_mitglied_login_reservierungen_token"), table_name="mitglied_login_reservierungen"
    )
    op.drop_table("mitglied_login_reservierungen")
