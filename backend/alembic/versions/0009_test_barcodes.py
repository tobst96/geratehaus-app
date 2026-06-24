"""Seed three test persons with fixed, easy-to-type barcode tokens
(Test1/Test2/Test3) for manual testing of the kiosk scan flow.

Revision ID: 0009
Revises: 0008
Create Date: 2026-06-27 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None

_TEST_TOKENS = ["Test1", "Test2", "Test3"]


def upgrade() -> None:
    connection = op.get_bind()
    for nummer, token in enumerate(_TEST_TOKENS, start=1):
        vorname = "Test"
        nachname = str(nummer)
        name = f"{vorname} {nachname}"

        bestehend = connection.execute(
            sa.text("SELECT id FROM personen WHERE name = :name"), {"name": name}
        ).first()
        if bestehend:
            person_id = bestehend[0]
        else:
            person_id = connection.execute(
                sa.text(
                    "INSERT INTO personen (name, vorname, nachname) "
                    "VALUES (:name, :vorname, :nachname) RETURNING id"
                ),
                {"name": name, "vorname": vorname, "nachname": nachname},
            ).scalar_one()

        bestehender_token = connection.execute(
            sa.text("SELECT id FROM barcode_tokens WHERE token = :token"), {"token": token}
        ).first()
        if not bestehender_token:
            connection.execute(
                sa.text(
                    "INSERT INTO barcode_tokens (person_id, token, created_at) "
                    "VALUES (:person_id, :token, now())"
                ),
                {"person_id": person_id, "token": token},
            )


def downgrade() -> None:
    connection = op.get_bind()
    for token in _TEST_TOKENS:
        connection.execute(sa.text("DELETE FROM barcode_tokens WHERE token = :token"), {"token": token})
    connection.execute(
        sa.text("DELETE FROM personen WHERE name IN ('Test 1', 'Test 2', 'Test 3')")
    )
