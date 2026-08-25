"""Neues Modul Dienstbuch Planer (Phase 1): Wiederholungsregeln, konkrete
Termin-Instanzen pro Jahr, Kategorien, Audit-Protokoll mit Akteur.

Revision ID: 0072
Revises: 0071
Create Date: 2026-08-25 00:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

revision = "0072"
down_revision = "0071"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "planer_kategorien",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False, unique=True),
        sa.Column("farbe", sa.String(length=7), nullable=False),
        sa.Column("reihenfolge", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "aktualisiert_am", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )

    op.create_table(
        "dienstbuch_plan_vorlagen",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("titel", sa.String(length=255), nullable=False),
        sa.Column("beschreibung", sa.Text(), nullable=True),
        sa.Column("wiederholungstyp", sa.String(length=32), nullable=False),
        sa.Column("intervall", sa.Integer(), nullable=True),
        sa.Column("wochentag", sa.Integer(), nullable=True),
        sa.Column("kalenderwoche", sa.Integer(), nullable=True),
        sa.Column("kw_paritaet", sa.String(length=16), nullable=True),
        sa.Column("mindest_intervall_aktiv", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("mindest_intervall_tage", sa.Integer(), nullable=True),
        sa.Column("startdatum", sa.Date(), nullable=False),
        sa.Column("enddatum", sa.Date(), nullable=True),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "aktualisiert_am", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )

    op.create_table(
        "dienstbuch_plan_termine",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "vorlage_id",
            sa.Integer(),
            sa.ForeignKey("dienstbuch_plan_vorlagen.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("jahr", sa.Integer(), nullable=False),
        sa.Column("titel", sa.String(length=255), nullable=False),
        sa.Column("beschreibung", sa.Text(), nullable=True),
        sa.Column("zieldatum", sa.Date(), nullable=True),
        sa.Column("ist_platzhalter", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="entwurf"),
        sa.Column(
            "dienstbuch_id",
            sa.Integer(),
            sa.ForeignKey("dienstbuecher.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("dienstbuch_erzeugt_am", sa.DateTime(timezone=True), nullable=True),
        sa.Column("mindest_intervall_letzte_referenz", sa.Date(), nullable=True),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "aktualisiert_am", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("dienstbuch_id", name="uq_dienstbuch_plan_termine_dienstbuch_id"),
    )
    op.create_index(
        "ix_dienstbuch_plan_termine_vorlage_jahr", "dienstbuch_plan_termine", ["vorlage_id", "jahr"]
    )
    op.create_index("ix_dienstbuch_plan_termine_zieldatum", "dienstbuch_plan_termine", ["zieldatum"])
    op.create_index("ix_dienstbuch_plan_termine_status", "dienstbuch_plan_termine", ["status"])

    op.create_table(
        "dienstbuch_plan_termin_ereignisse",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "termin_id",
            sa.Integer(),
            sa.ForeignKey("dienstbuch_plan_termine.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("zeitpunkt", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("typ", sa.String(length=64), nullable=False),
        sa.Column("beschreibung", sa.Text(), nullable=False),
        sa.Column("akteur_name", sa.String(length=255), nullable=True),
    )

    op.create_table(
        "dienstbuch_plan_vorlage_kategorien",
        sa.Column(
            "vorlage_id",
            sa.Integer(),
            sa.ForeignKey("dienstbuch_plan_vorlagen.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "kategorie_id",
            sa.Integer(),
            sa.ForeignKey("planer_kategorien.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )

    op.create_table(
        "dienstbuch_plan_termin_kategorien",
        sa.Column(
            "termin_id",
            sa.Integer(),
            sa.ForeignKey("dienstbuch_plan_termine.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "kategorie_id",
            sa.Integer(),
            sa.ForeignKey("planer_kategorien.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )


def downgrade() -> None:
    op.drop_table("dienstbuch_plan_termin_kategorien")
    op.drop_table("dienstbuch_plan_vorlage_kategorien")
    op.drop_table("dienstbuch_plan_termin_ereignisse")
    op.drop_index("ix_dienstbuch_plan_termine_status", table_name="dienstbuch_plan_termine")
    op.drop_index("ix_dienstbuch_plan_termine_zieldatum", table_name="dienstbuch_plan_termine")
    op.drop_index("ix_dienstbuch_plan_termine_vorlage_jahr", table_name="dienstbuch_plan_termine")
    op.drop_table("dienstbuch_plan_termine")
    op.drop_table("dienstbuch_plan_vorlagen")
    op.drop_table("planer_kategorien")
