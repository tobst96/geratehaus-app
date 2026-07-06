"""Regression: Ist das Barcode-Modul deaktiviert (Login per Name+PIN), darf die
automatische Barcode-Erneuerungsmail NICHT versendet werden – auch wenn eine
Person eine E-Mail hinterlegt und Benachrichtigungen aktiviert hat."""

import pytest
from sqlalchemy import func, select

from app.models.barcode_token import BarcodeToken
from app.models.person import Person
from app.services import barcode_service
from app.services.config_service import config_service


async def _person_mit_mail(db, name="Mit Mail"):
    p = Person(name=name, email="x@example.org", benachrichtigungen_aktiv=True)
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


async def _anzahl_tokens(db, person_id: int) -> int:
    return (
        await db.execute(
            select(func.count()).select_from(BarcodeToken).where(BarcodeToken.person_id == person_id)
        )
    ).scalar()


@pytest.mark.asyncio
async def test_keine_barcode_mail_wenn_modul_aus(db):
    # E-Mail-Versand aktiv, Person berechtigt – NUR das ausgeschaltete Barcode-Modul
    # darf den Versand verhindern (und damit auch die Neuerzeugung eines Barcodes).
    await config_service.set(db, "modul_barcode_aktiv", False)
    await config_service.set(db, "notifier_email_aktiv", True)
    person = await _person_mit_mail(db)

    await barcode_service.erneuerung_mail_senden(db, person)

    assert await _anzahl_tokens(db, person.id) == 0
