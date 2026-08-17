"""Totes "Barcode vergessen"-Zweitgeräte-Login-Feature entfernen: Tabelle
mitglied_login_reservierungen droppen.

Der einzige Einstiegspunkt (Button auf /mitglied/login) wurde bereits entfernt
– es können auf keiner laufenden Instanz mehr neue Reservierungen entstehen,
und bestehende Tokens waren ohnehin nur 15 Minuten gültig. Downgrade legt die
(leere) Tabelle wieder an.
"""

import sqlalchemy as sa
from alembic import op

revision = "0068"
down_revision = "0067"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index(
        op.f("ix_mitglied_login_reservierungen_token"), table_name="mitglied_login_reservierungen"
    )
    op.drop_table("mitglied_login_reservierungen")


def downgrade() -> None:
    op.create_table(
        "mitglied_login_reservierungen",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(64), nullable=False),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ablauf_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("person_id", sa.Integer(), nullable=True),
        sa.Column("bestaetigt", sa.Boolean(), nullable=False),
        sa.Column("eingeloest", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["person_id"], ["personen.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token"),
    )
    op.create_index(
        op.f("ix_mitglied_login_reservierungen_token"),
        "mitglied_login_reservierungen",
        ["token"],
        unique=True,
    )
