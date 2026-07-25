"""Tabelle passwort_setzen_tokens für den „Passwort setzen"-Link (Mitglieder-Login).

Analog zu pin_setzen_tokens, aber für das persönliche Passwort statt den PIN.
"""

import sqlalchemy as sa
from alembic import op

revision = "0067"
down_revision = "0066"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "passwort_setzen_tokens",
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
    op.create_index(
        "ix_passwort_setzen_tokens_token", "passwort_setzen_tokens", ["token"], unique=True
    )


def downgrade() -> None:
    op.drop_index("ix_passwort_setzen_tokens_token", table_name="passwort_setzen_tokens")
    op.drop_table("passwort_setzen_tokens")
