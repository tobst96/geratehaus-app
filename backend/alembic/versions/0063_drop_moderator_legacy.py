"""Legacy des alten Moderator-Kontos entfernen + 2FA-Tabellen umbenennen.

Abschluss des Umbaus „Person = Konto" / Terminologie „Moderator" → „Gruppenführer":
- verwaiste 2FA-Zeilen (nur ans alte Moderator-Konto gebunden) löschen,
- `moderator_id`-Spalten (Rollback-Alt-Bestand) aus `berechtigungen` und den beiden
  2FA-Tabellen entfernen,
- 2FA-Tabellen `moderator_recovery_codes`/`moderator_trusted_devices` →
  `gruppenfuehrer_recovery_codes`/`gruppenfuehrer_trusted_devices` umbenennen,
- Legacy-Tabelle `moderatoren` droppen.

Achtung: hebt den Rollback-Puffer für die Person=Konto-Migration (0060) auf –
bewusst so entschieden, nachdem Person=Konto im Livebetrieb bestätigt ist.
"""

import sqlalchemy as sa
from alembic import op

revision = "0063"
down_revision = "0062"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    # Nur ans alte Moderator-Konto gebundene 2FA-Zeilen (ohne person_id) sind tot.
    conn.execute(sa.text("DELETE FROM moderator_recovery_codes WHERE person_id IS NULL"))
    conn.execute(sa.text("DELETE FROM moderator_trusted_devices WHERE person_id IS NULL"))

    # moderator_id-Spalten (+ abhängige FKs/Constraints) entfernen.
    op.drop_constraint("uq_berechtigung_moderator_modul", "berechtigungen", type_="unique")
    op.drop_column("berechtigungen", "moderator_id")
    op.drop_column("moderator_recovery_codes", "moderator_id")
    op.drop_column("moderator_trusted_devices", "moderator_id")

    # Aktive 2FA-Tabellen umbenennen.
    op.rename_table("moderator_recovery_codes", "gruppenfuehrer_recovery_codes")
    op.rename_table("moderator_trusted_devices", "gruppenfuehrer_trusted_devices")

    # Legacy-Konto-Tabelle entfernen.
    op.drop_table("moderatoren")


def downgrade() -> None:
    # Strukturell (die Daten der gedroppten Tabelle/Spalten sind unwiederbringlich).
    op.create_table(
        "moderatoren",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=255), nullable=False, unique=True),
        sa.Column("passwort_hash", sa.String(length=255), nullable=False),
        sa.Column("rolle", sa.String(length=64), nullable=False, server_default="admin"),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("benachrichtigungen_aktiv", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("login_fehlversuche", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("login_gesperrt_bis", sa.DateTime(timezone=True), nullable=True),
        sa.Column("zwei_faktor_aktiv", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("otp_code_hash", sa.String(length=255), nullable=True),
        sa.Column("otp_ablauf_am", sa.DateTime(timezone=True), nullable=True),
        sa.Column("otp_versuche", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=True),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=True),
    )

    op.rename_table("gruppenfuehrer_recovery_codes", "moderator_recovery_codes")
    op.rename_table("gruppenfuehrer_trusted_devices", "moderator_trusted_devices")

    for tabelle in ("moderator_recovery_codes", "moderator_trusted_devices"):
        op.add_column(
            tabelle,
            sa.Column(
                "moderator_id",
                sa.Integer(),
                sa.ForeignKey("moderatoren.id", ondelete="CASCADE"),
                nullable=True,
            ),
        )
    op.add_column(
        "berechtigungen",
        sa.Column(
            "moderator_id",
            sa.Integer(),
            sa.ForeignKey("moderatoren.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    op.create_unique_constraint(
        "uq_berechtigung_moderator_modul", "berechtigungen", ["moderator_id", "modul_id"]
    )
