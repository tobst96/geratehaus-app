"""Rename formulare.moderator_sichtbar -> gruppenfuehrer_sichtbar.

Letzter Teil des Terminologie-Umbaus „Moderator" -> „Gruppenführer".
Reine Spalten-Umbenennung (Daten bleiben erhalten).
"""

from alembic import op

revision = "0064"
down_revision = "0063"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("formulare", "moderator_sichtbar", new_column_name="gruppenfuehrer_sichtbar")


def downgrade() -> None:
    op.alter_column("formulare", "gruppenfuehrer_sichtbar", new_column_name="moderator_sichtbar")
