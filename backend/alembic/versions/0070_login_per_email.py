"""Login (Gruppenführer-/Admin- und Mitglied-Passwort-Login) läuft künftig per
E-Mail statt Name. E-Mail muss daher unter den Personen mit gesetztem Passwort
eindeutig sein – ein globaler Unique-Constraint würde aber reine Mitglieder
ohne Login treffen, die sich z. B. ein Familien-Postfach für Benachrichtigungen
teilen. Daher ein partieller, case-insensitiver Unique-Index nur für
`passwort_hash IS NOT NULL`.

E-Mail war bislang optional - ein Admin/Gruppenführer konnte also ein Passwort
haben, ohne je eine E-Mail zu hinterlegen, und mehrere Login-Personen könnten
sich (durch Altdaten/Copy-Paste) zufällig dieselbe E-Mail teilen. Beides würde
nach dieser Migration zum kompletten, selbsthilfefreien Login-Ausschluss führen
(Login UND Passwort-Reset brauchen ab jetzt eine eindeutige E-Mail). Die
Migration prüft daher vorab auf beide Fälle und bricht kontrolliert mit einer
Liste der betroffenen Personen ab, statt still Daten zu verändern oder jemanden
auszusperren - der Betreiber muss vor dem erneuten Versuch für jede betroffene
Person eine eigene, eindeutige E-Mail hinterlegen (z. B. per SQL:
`UPDATE personen SET email = '...' WHERE id = ...;`).

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

    duplikate = bind.execute(
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
    fehlende_email = bind.execute(
        sa.text(
            """
            SELECT id, name
            FROM personen
            WHERE passwort_hash IS NOT NULL AND email IS NULL
            ORDER BY id
            """
        )
    ).fetchall()

    if duplikate or fehlende_email:
        probleme = [
            f"E-Mail '{email_lower}' wird von mehreren Login-Personen geteilt (ids {ids})"
            for email_lower, ids in duplikate
        ]
        if fehlende_email:
            details = ", ".join(f"{name} (id={id_})" for id_, name in fehlende_email)
            probleme.append(f"Login-Personen ohne E-Mail: {details}")
        raise RuntimeError(
            "[migration 0070] Login per E-Mail nicht möglich, folgende Konflikte zuerst "
            "manuell beheben (jede Login-Person braucht eine eigene, eindeutige E-Mail, "
            "z. B. per SQL: UPDATE personen SET email = '...' WHERE id = ...;): "
            + "; ".join(probleme)
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
