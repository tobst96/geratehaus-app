"""Add configurable Einsatz fields, Teilnahme-Bemerkung and geraetehaus-only entries

Revision ID: 0006
Revises: 0005
Create Date: 2026-06-25 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None

_DEFAULT_FELDER = [
    ("einsatzleiter", "Einsatzleiter", "text", 0),
    ("einheitsfuehrer", "Einheitsführer", "text", 1),
    ("erste_lage", "Erste Lage", "mehrzeilig", 2),
    ("taetigkeit", "Tätigkeit", "mehrzeilig", 3),
]


def upgrade() -> None:
    op.add_column(
        "einsatz_personen",
        sa.Column("bemerkung", sa.Text(), nullable=True),
    )
    op.add_column(
        "einsaetze",
        sa.Column("zusatzfelder", sa.JSON(), nullable=False, server_default="{}"),
    )

    op.create_table(
        "einsatz_feld_definitionen",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("schluessel", sa.String(64), nullable=False),
        sa.Column("label", sa.String(255), nullable=False),
        sa.Column("typ", sa.String(32), nullable=False),
        sa.Column("reihenfolge", sa.Integer(), nullable=False),
        sa.Column("aktiv", sa.Boolean(), nullable=False),
        sa.Column(
            "erstellt_am", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "aktualisiert_am", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("schluessel"),
    )

    feld_tabelle = sa.table(
        "einsatz_feld_definitionen",
        sa.column("schluessel", sa.String),
        sa.column("label", sa.String),
        sa.column("typ", sa.String),
        sa.column("reihenfolge", sa.Integer),
        sa.column("aktiv", sa.Boolean),
    )
    op.bulk_insert(
        feld_tabelle,
        [
            {
                "schluessel": schluessel,
                "label": label,
                "typ": typ,
                "reihenfolge": reihenfolge,
                "aktiv": True,
            }
            for schluessel, label, typ, reihenfolge in _DEFAULT_FELDER
        ],
    )


def downgrade() -> None:
    op.drop_table("einsatz_feld_definitionen")
    op.drop_column("einsaetze", "zusatzfelder")
    op.drop_column("einsatz_personen", "bemerkung")
