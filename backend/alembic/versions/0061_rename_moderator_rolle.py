"""Rename personen.moderator_rolle -> gruppenfuehrer_rolle.

Teil des Terminologie-Umbaus „Moderator" -> „Gruppenführer". Reine Spalten-
Umbenennung (Daten bleiben erhalten); die Spalte hält weiter NULL / 'admin' /
'gruppenfuehrer'.
"""

from alembic import op

revision = "0061"
down_revision = "0060"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("personen", "moderator_rolle", new_column_name="gruppenfuehrer_rolle")


def downgrade() -> None:
    op.alter_column("personen", "gruppenfuehrer_rolle", new_column_name="moderator_rolle")
