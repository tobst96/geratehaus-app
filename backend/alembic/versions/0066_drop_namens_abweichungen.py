"""Feature „Namensabweichungen" entfernen: Tabelle namens_abweichungen droppen.

Die Erfassung war bereits inaktiv (kein Aufrufer), die Admin-Liste wird mit
diesem Release entfernt. Downgrade legt die (leere) Tabelle wieder an.
"""

import sqlalchemy as sa
from alembic import op

revision = "0066"
down_revision = "0065"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table("namens_abweichungen")


def downgrade() -> None:
    op.create_table(
        "namens_abweichungen",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("cookie_name", sa.String(255), nullable=False),
        sa.Column("eingetragener_name", sa.String(255), nullable=False),
        sa.Column(
            "zeitstempel", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
