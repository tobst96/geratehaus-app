"""Update default branding color from red to orange

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-24 00:00:00.000000

"""
from alembic import op


revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Only overwrite values that still match the old default - never touch
    # colors a moderator has already customized.
    op.execute(
        "UPDATE app_config SET wert = '#FFA633' "
        "WHERE schluessel = 'farbe_primaer' AND wert = '#CC0000'"
    )
    op.execute(
        "UPDATE app_config SET wert = '#1A1A1A' "
        "WHERE schluessel = 'farbe_akzent' AND wert = '#000000'"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE app_config SET wert = '#CC0000' "
        "WHERE schluessel = 'farbe_primaer' AND wert = '#FFA633'"
    )
    op.execute(
        "UPDATE app_config SET wert = '#000000' "
        "WHERE schluessel = 'farbe_akzent' AND wert = '#1A1A1A'"
    )
