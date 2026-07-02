"""erstellt_am-Server-Default nachziehen (Model/DB-Drift beheben)

Mehrere Tabellen haben `erstellt_am` als NOT NULL, aber ohne DB-seitigen
Default angelegt bekommen. Für `divera_vorschlaege` deklariert das Model
`server_default=func.now()` – der wirkt aber nur bei `Base.metadata.create_all`
(Tests), nicht in den per Migration gebauten Produktions-DBs. Folge: der
Divera-Personal-Abgleich fügt DiveraVorschlag-Zeilen ein, ohne `erstellt_am`
zu setzen → NOT-NULL-Verletzung → der ganze Commit rollt zurück → es entstehen
NIE Vorschläge.

Diese Migration setzt für alle betroffenen `erstellt_am`-Spalten den
DB-Default `now()`. Für die Reservierungs-/Token-Tabellen ist das eine reine
Härtung (ihre Services setzen `erstellt_am` bereits explizit), für
`divera_vorschlaege` ist es der eigentliche Bugfix.

Revision ID: 0040
Revises: 0039
Create Date: 2026-07-02 15:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0040"
down_revision = "0039"
branch_labels = None
depends_on = None

_TABELLEN = [
    "divera_vorschlaege",
    "buchung_aktion_tokens",
    "dienstbuch_reservierungen",
    "dienststunden_reservierungen",
    "fahrzeugbuchung_reservierungen",
    "mitglied_login_reservierungen",
    "person_bild_reservierungen",
    "sitzplatz_reservierungen",
]


def upgrade() -> None:
    for tabelle in _TABELLEN:
        op.alter_column(
            tabelle,
            "erstellt_am",
            existing_type=sa.DateTime(timezone=True),
            existing_nullable=False,
            server_default=sa.text("now()"),
        )


def downgrade() -> None:
    for tabelle in _TABELLEN:
        op.alter_column(
            tabelle,
            "erstellt_am",
            existing_type=sa.DateTime(timezone=True),
            existing_nullable=False,
            server_default=None,
        )
