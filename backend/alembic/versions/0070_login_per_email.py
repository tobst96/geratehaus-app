"""Login (Gruppenführer-/Admin- und Mitglied-Passwort-Login) läuft künftig per
E-Mail statt Name. E-Mail muss daher unter den Personen mit gesetztem Passwort
eindeutig sein – ein globaler Unique-Constraint würde aber reine Mitglieder
ohne Login treffen, die sich z. B. ein Familien-Postfach für Benachrichtigungen
teilen. Daher ein partieller, case-insensitiver Unique-Index nur für
`passwort_hash IS NOT NULL`.

Vor dem Anlegen des Index werden bestehende Konflikte (mehrere Login-Personen
mit derselben E-Mail) automatisch aufgelöst: die älteste Person (kleinste id)
behält die E-Mail, bei den anderen wird sie entfernt (sie können sich künftig
nicht mehr per Passwort einloggen, bis ein Admin eine neue E-Mail hinterlegt -
siehe "Erhöhter Zugang" in Personal). Das ist der einzige Weg, ein bestehendes
Deployment mit Altdaten nicht am fehlschlagenden CREATE UNIQUE INDEX
abzubrechen; jeder aufgelöste Konflikt wird beim Migrieren geloggt.

Revision ID: 0070
Revises: 0069
Create Date: 2026-08-18 00:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

revision = "0070"
down_revision = "0069"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    konflikte = bind.execute(
        sa.text(
            """
            SELECT lower(email) AS email_lower, array_agg(id ORDER BY id) AS ids
            FROM personen
            WHERE passwort_hash IS NOT NULL AND email IS NOT NULL
            GROUP BY lower(email)
            HAVING count(*) > 1
            """
        )
    ).fetchall()
    for email_lower, ids in konflikte:
        behalten, *entfernen = ids
        bind.execute(
            sa.text("UPDATE personen SET email = NULL WHERE id = ANY(:ids)"),
            {"ids": entfernen},
        )
        print(
            f"[migration 0070] Mehrere Login-Personen teilten sich die E-Mail "
            f"'{email_lower}' - Person {behalten} behält sie, bei {entfernen} wurde "
            f"die E-Mail entfernt (Login per Passwort dort erst nach neuer E-Mail "
            f"über 'Erhöhter Zugang' in Personal wieder möglich)."
        )

    op.create_index(
        "ix_personen_email_login_unique",
        "personen",
        [sa.text("lower(email)")],
        unique=True,
        postgresql_where=sa.text("passwort_hash IS NOT NULL AND email IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_personen_email_login_unique", table_name="personen")
