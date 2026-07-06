"""Konfigurierbare Zusatzfelder für Dienstbücher (analog Einsatz-Felder)

Neue Tabelle `dienstbuch_feld_definitionen` (frei konfigurierbare Felder je
Dienstbuch, inkl. neuem Typ „auswahl" mit Optionen) plus JSONB-Spalte
`zusatzfelder` auf `dienstbuecher` für die eigentlichen Werte.

Revision ID: 0057
Revises: 0056
Create Date: 2026-07-06 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0057"
down_revision = "0056"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "dienstbuecher",
        sa.Column(
            "zusatzfelder",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
    )

    op.create_table(
        "dienstbuch_feld_definitionen",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("schluessel", sa.String(64), nullable=False),
        sa.Column("label", sa.String(255), nullable=False),
        sa.Column("typ", sa.String(32), nullable=False),
        sa.Column(
            "optionen",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("reihenfolge", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "erstellt_am", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "aktualisiert_am", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("schluessel"),
    )


def downgrade() -> None:
    op.drop_table("dienstbuch_feld_definitionen")
    op.drop_column("dienstbuecher", "zusatzfelder")
