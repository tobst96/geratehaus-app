"""Rename app_config keys moderator_login_* -> gruppenfuehrer_login_*.

Teil des Terminologie-Umbaus „Moderator" -> „Gruppenführer". Benennt die beiden
Brute-Force-Config-Keys um und erhält dabei ggf. gesetzte Werte (UPDATE statt
Neu-Seed über die Defaults).
"""

from alembic import op

revision = "0062"
down_revision = "0061"
branch_labels = None
depends_on = None

_UMBENENNUNGEN = [
    ("moderator_login_max_fehlversuche", "gruppenfuehrer_login_max_fehlversuche"),
    ("moderator_login_sperre_minuten", "gruppenfuehrer_login_sperre_minuten"),
]


def upgrade() -> None:
    for alt, neu in _UMBENENNUNGEN:
        op.execute(
            f"UPDATE app_config SET schluessel = '{neu}' WHERE schluessel = '{alt}'"
        )


def downgrade() -> None:
    for alt, neu in _UMBENENNUNGEN:
        op.execute(
            f"UPDATE app_config SET schluessel = '{alt}' WHERE schluessel = '{neu}'"
        )
