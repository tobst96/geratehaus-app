"""Add ON DELETE CASCADE to person_id FKs, so deleting a person (e.g. via
the inactivity cleanup job) also removes all of their dependent records.

Revision ID: 0023
Revises: 0022
Create Date: 2026-06-26 09:00:00.000000

"""
from alembic import op

revision = "0023"
down_revision = "0022"
branch_labels = None
depends_on = None

_FKS = [
    ("einsatz_personen_person_id_fkey", "einsatz_personen", "person_id"),
    ("dienstbuch_personen_person_id_fkey", "dienstbuch_personen", "person_id"),
    ("dienststunden_person_id_fkey", "dienststunden", "person_id"),
    ("fahrzeug_buchungen_verantwortliche_person_id_fkey", "fahrzeug_buchungen", "verantwortliche_person_id"),
    ("barcode_tokens_person_id_fkey", "barcode_tokens", "person_id"),
]


def upgrade() -> None:
    for constraint_name, table, column in _FKS:
        op.drop_constraint(constraint_name, table, type_="foreignkey")
        op.create_foreign_key(
            constraint_name, table, "personen", [column], ["id"], ondelete="CASCADE"
        )


def downgrade() -> None:
    for constraint_name, table, column in _FKS:
        op.drop_constraint(constraint_name, table, type_="foreignkey")
        op.create_foreign_key(constraint_name, table, "personen", [column], ["id"])
