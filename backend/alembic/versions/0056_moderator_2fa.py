"""Admin-/Moderator-2FA per E-Mail-OTP (opt-in) + Recovery-Codes + Trusted-Devices

Ergänzt die Tabelle `moderatoren` um 2FA-Felder (opt-in-Schalter + kurzlebiger
OTP-Zustand) und legt zwei Hilfstabellen an:
- `moderator_recovery_codes`: gehashte Einmal-Wiederherstellungscodes.
- `moderator_trusted_devices`: gehashte Geräte-Token (30 Tage), damit auf
  bekannten Geräten kein OTP nötig ist.

Revision ID: 0056
Revises: 0055
Create Date: 2026-07-06 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0056"
down_revision = "0055"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "moderatoren",
        sa.Column("zwei_faktor_aktiv", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("moderatoren", sa.Column("otp_code_hash", sa.String(length=255), nullable=True))
    op.add_column("moderatoren", sa.Column("otp_ablauf_am", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "moderatoren",
        sa.Column("otp_versuche", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "moderator_recovery_codes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "moderator_id",
            sa.Integer(),
            sa.ForeignKey("moderatoren.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("code_hash", sa.String(length=255), nullable=False),
        sa.Column("benutzt", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    op.create_table(
        "moderator_trusted_devices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "moderator_id",
            sa.Integer(),
            sa.ForeignKey("moderatoren.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("token_hash", sa.String(length=255), nullable=False, index=True),
        sa.Column("ablauf_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("moderator_trusted_devices")
    op.drop_table("moderator_recovery_codes")
    op.drop_column("moderatoren", "otp_versuche")
    op.drop_column("moderatoren", "otp_ablauf_am")
    op.drop_column("moderatoren", "otp_code_hash")
    op.drop_column("moderatoren", "zwei_faktor_aktiv")
