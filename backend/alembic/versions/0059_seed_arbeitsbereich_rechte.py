"""Anti-Aussperr-Seed: Arbeitsbereich-Rechte für bestehende Gruppenführer

Die Moderator-Endpunkte der vier Arbeitsbereiche (einsatztagebuch, dienstbuch,
dienststunden, fahrzeugbuchung) werden jetzt über `require_modul_zugriff` granular
geschützt (statt „jeder Moderator"). Damit **bestehende Non-Admin-Moderatoren
(Gruppenführer) nach dem Update nicht plötzlich ausgesperrt** werden, bekommen sie
hier genau diese vier Modul-Rechte geseedet – das entspricht ihrem bisherigen
Zugriff (Status quo). Admins sind über den Admin-Bypass unberührt.

Idempotent (NOT EXISTS) und robust gegen frische DB: fehlen die `module`-Zeilen
noch (werden erst beim App-Start via `modul_service.ensure_module` geseedet), fügt
das CROSS JOIN nichts ein – auf einer frischen DB gibt es ohnehin keine
Gruppenführer.

Revision ID: 0059
Revises: 0058
Create Date: 2026-07-08 12:00:00.000000

"""
from alembic import op

revision = "0059"
down_revision = "0058"
branch_labels = None
depends_on = None

_ARBEITSBEREICHE = ("einsatztagebuch", "dienstbuch", "dienststunden", "fahrzeugbuchung")


def upgrade() -> None:
    keys = ", ".join(f"'{k}'" for k in _ARBEITSBEREICHE)
    op.execute(
        f"""
        INSERT INTO berechtigungen (moderator_id, modul_id)
        SELECT m.id, md.id
        FROM moderatoren m
        CROSS JOIN module md
        WHERE m.rolle <> 'admin'
          AND md.key IN ({keys})
          AND NOT EXISTS (
              SELECT 1 FROM berechtigungen b
              WHERE b.moderator_id = m.id AND b.modul_id = md.id
          )
        """
    )


def downgrade() -> None:
    # Bewusst kein Rückbau: Der Seed ist nicht von manuell erteilten Rechten zu
    # unterscheiden; ein pauschales Löschen würde legitim vergebene Zugriffe
    # entfernen. Downgrade daher no-op.
    pass
