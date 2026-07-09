"""Person als Konto: Moderator-Auth-Felder + person_id (additiv, Phase 1)

Erster, **rein additiver** Schritt der Zusammenlegung von Moderator-Zugängen in
Personal (die Person wird das Konto): fügt der Person die Moderator-Auth-Felder
hinzu (Rolle, Passwort, 2FA, Login-Sperre) und hängt an `berechtigungen`,
`moderator_recovery_codes` und `moderator_trusted_devices` je eine nullable
`person_id` an. `moderator_id` wird nullable (bleibt erhalten → Rollback möglich).

Noch **keine** Datenmigration und **kein** Umschalten der Auth – der Code nutzt in
dieser Phase weiter die `moderatoren`-Tabelle. Admin-Übernahme + Auth-Umstellung
folgen in weiteren Schritten desselben Feature-Branches.

Revision ID: 0060
Revises: 0059
Create Date: 2026-07-09 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0060"
down_revision = "0059"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- personen: Moderator-Auth-Felder ---
    op.add_column("personen", sa.Column("moderator_rolle", sa.String(64), nullable=True))
    op.add_column("personen", sa.Column("passwort_hash", sa.String(255), nullable=True))
    op.add_column(
        "personen",
        sa.Column("zwei_faktor_aktiv", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("personen", sa.Column("otp_code_hash", sa.String(255), nullable=True))
    op.add_column(
        "personen", sa.Column("otp_ablauf_am", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "personen",
        sa.Column("otp_versuche", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "personen",
        sa.Column("login_fehlversuche", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "personen", sa.Column("login_gesperrt_bis", sa.DateTime(timezone=True), nullable=True)
    )

    # --- berechtigungen: person_id + moderator_id nullable + Unique(person, modul) ---
    op.add_column("berechtigungen", sa.Column("person_id", sa.Integer(), nullable=True))
    op.create_index("ix_berechtigungen_person_id", "berechtigungen", ["person_id"])
    op.create_foreign_key(
        "fk_berechtigungen_person",
        "berechtigungen",
        "personen",
        ["person_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.alter_column("berechtigungen", "moderator_id", existing_type=sa.Integer(), nullable=True)
    op.create_unique_constraint(
        "uq_berechtigung_person_modul", "berechtigungen", ["person_id", "modul_id"]
    )

    # --- recovery-codes + trusted-devices: person_id + moderator_id nullable ---
    for tabelle in ("moderator_recovery_codes", "moderator_trusted_devices"):
        op.add_column(tabelle, sa.Column("person_id", sa.Integer(), nullable=True))
        op.create_index(f"ix_{tabelle}_person_id", tabelle, ["person_id"])
        op.create_foreign_key(
            f"fk_{tabelle}_person", tabelle, "personen", ["person_id"], ["id"], ondelete="CASCADE"
        )
        op.alter_column(tabelle, "moderator_id", existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    for tabelle in ("moderator_recovery_codes", "moderator_trusted_devices"):
        op.alter_column(tabelle, "moderator_id", existing_type=sa.Integer(), nullable=False)
        op.drop_constraint(f"fk_{tabelle}_person", tabelle, type_="foreignkey")
        op.drop_index(f"ix_{tabelle}_person_id", tabelle)
        op.drop_column(tabelle, "person_id")

    op.drop_constraint("uq_berechtigung_person_modul", "berechtigungen", type_="unique")
    op.alter_column("berechtigungen", "moderator_id", existing_type=sa.Integer(), nullable=False)
    op.drop_constraint("fk_berechtigungen_person", "berechtigungen", type_="foreignkey")
    op.drop_index("ix_berechtigungen_person_id", "berechtigungen")
    op.drop_column("berechtigungen", "person_id")

    for spalte in (
        "login_gesperrt_bis",
        "login_fehlversuche",
        "otp_versuche",
        "otp_ablauf_am",
        "otp_code_hash",
        "zwei_faktor_aktiv",
        "passwort_hash",
        "moderator_rolle",
    ):
        op.drop_column("personen", spalte)
