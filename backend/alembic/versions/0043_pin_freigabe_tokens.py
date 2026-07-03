"""PIN-Self-Service- und Personen-Freigabe-Tokens

Zwei kurzlebige Token-Tabellen für den Namen+PIN-Login (Barcode-Modul AUS):
- `pin_setzen_tokens`: Self-Service-Link, über den eine Person mit E-Mail ihren
  PIN selbst setzt.
- `person_freigabe_tokens`: Moderator-Freigabe, wenn eine Person ohne E-Mail
  einen PIN anfordert (Freigeben/Ablehnen aus der Mail).

Revision ID: 0043
Revises: 0042
Create Date: 2026-07-03 12:10:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0043"
down_revision = "0042"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pin_setzen_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "person_id",
            sa.Integer(),
            sa.ForeignKey("personen.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token", sa.String(64), nullable=False),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ablauf_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("eingeloest", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_pin_setzen_tokens_token", "pin_setzen_tokens", ["token"], unique=True)

    op.create_table(
        "person_freigabe_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "person_id",
            sa.Integer(),
            sa.ForeignKey("personen.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token", sa.String(64), nullable=False),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ablauf_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="offen"),
    )
    op.create_index(
        "ix_person_freigabe_tokens_token", "person_freigabe_tokens", ["token"], unique=True
    )


def downgrade() -> None:
    op.drop_index("ix_person_freigabe_tokens_token", table_name="person_freigabe_tokens")
    op.drop_table("person_freigabe_tokens")
    op.drop_index("ix_pin_setzen_tokens_token", table_name="pin_setzen_tokens")
    op.drop_table("pin_setzen_tokens")
