"""Etappe F2: „Barcode vergessen" verlangt überall einen gesetzten + korrekten
PIN. Personen ohne PIN werden gesperrt und der Versuch in der Timeline vermerkt."""

import pytest

from app.models.person import Person
from app.schemas.reservierung import ReservierungAnlegen
from app.services import reservierung_service, stammdaten_service
from app.services.einsatz_service import einsatz_anlegen
from app.schemas.einsatz import EinsatzAnlegen
from datetime import datetime, timezone


async def _person(db, name, pin=None):
    p = Person(name=name)
    db.add(p)
    await db.commit()
    await db.refresh(p)
    if pin:
        await stammdaten_service.person_pin_setzen(db, p, pin)
    return p


@pytest.mark.asyncio
async def test_pin_login_erzwingen_ohne_pin_verweigert_und_protokolliert(db):
    person = await _person(db, "Ohne PIN")
    with pytest.raises(PermissionError):
        await stammdaten_service.pin_login_erzwingen(db, person, None, "Test")
    ereignisse = await stammdaten_service.liste_person_ereignisse(db, person.id)
    assert any(e.typ == "pin_zugriff_verweigert" for e in ereignisse)


@pytest.mark.asyncio
async def test_pin_login_erzwingen_mit_korrektem_pin_ok(db):
    person = await _person(db, "Mit PIN", pin="4711")
    await stammdaten_service.pin_login_erzwingen(db, person, "4711", "Test")  # kein Fehler


@pytest.mark.asyncio
async def test_pin_login_erzwingen_falscher_pin_verweigert(db):
    person = await _person(db, "Mit PIN 2", pin="4711")
    with pytest.raises(PermissionError):
        await stammdaten_service.pin_login_erzwingen(db, person, "0000", "Test")


@pytest.mark.asyncio
async def test_reservierung_vorschau_ohne_pin_gesperrt(db):
    """Wiring-Test: Einsatz-Sitzplatz-Reservierung lehnt PIN-lose Person ab."""
    einsatz = await einsatz_anlegen(
        db, EinsatzAnlegen(titel="Test", zeitpunkt=datetime(2026, 7, 1, 12, 0, tzinfo=timezone.utc))
    )
    reservierung = await reservierung_service.reservierung_anlegen(
        db, einsatz.id, ReservierungAnlegen(fahrzeug_id=None, sitzplatz_id=None, bezeichnung="Testplatz")
    )
    person = await _person(db, "Kiosk ohne PIN")
    with pytest.raises(PermissionError):
        await reservierung_service.reservierung_vorschau_setzen(db, reservierung, person.id, None)
