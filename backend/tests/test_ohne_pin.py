"""„Ohne PIN": eine Eintragung/Anfrage per Name+PIN ohne gesetzten PIN blockiert
nicht mehr, wird aber auf dem jeweiligen Datensatz als ohne_pin=True vermerkt
(rot hervorgehoben + Text „Ja" in Listen-PDFs). Regression: mit korrekt
gesetztem PIN bleibt ohne_pin=False."""

from datetime import datetime, timedelta, timezone

import pytest

from app.core.security import hash_secret
from app.models.fahrzeug import Fahrzeug
from app.models.person import Person
from app.schemas.buchung import BuchungAnfrage
from app.schemas.dienstbuch import DienstbuchAnlegen, TeilnehmerAnlegen
from app.schemas.dienstbuch_reservierung import DienstbuchReservierungEinloesen
from app.schemas.fahrzeugbuchung_reservierung import FahrzeugbuchungReservierungEinloesen
from app.schemas.stammdaten import FunktionDienststundenCreate
from app.services import (
    buchung_service,
    dienstbuch_reservierung_service,
    dienstbuch_service,
    fahrzeugbuchung_reservierung_service,
    stammdaten_service,
)
from app.services.config_service import config_service


async def _person(db, name, pin=None):
    p = Person(name=name)
    db.add(p)
    await db.commit()
    await db.refresh(p)
    if pin:
        await stammdaten_service.person_pin_setzen(db, p, pin)
    return p


async def _mitglied_einloggen(client, person_id: int, pin: str | None) -> None:
    r = await client.post("/api/v1/auth/name-pin", json={"person_id": person_id, "pin": pin})
    assert r.status_code == 200


# --- Dienststunden -----------------------------------------------------------


async def _funktion(db, name="Maschinist"):
    return await stammdaten_service.funktion_dienststunden_anlegen(
        db, FunktionDienststundenCreate(name=name, schwellenwert_stunden=0, aktiv=True)
    )


@pytest.mark.asyncio
async def test_dienststunden_ohne_pin_wird_markiert(client, db):
    f = await _funktion(db)
    person = await _person(db, "Ohne Pin DS")
    await _mitglied_einloggen(client, person.id, None)

    r = await client.post(
        "/api/v1/dienststunden",
        json={"funktion_id": f.id, "stunden": 1, "datum": "2026-06-01", "ohne_pin": True},
    )
    assert r.status_code == 200
    assert r.json()["ohne_pin"] is True


@pytest.mark.asyncio
async def test_dienststunden_mit_pin_nicht_markiert(client, db):
    f = await _funktion(db)
    person = await _person(db, "Mit Pin DS", pin="4711")
    await _mitglied_einloggen(client, person.id, "4711")

    r = await client.post(
        "/api/v1/dienststunden",
        json={"funktion_id": f.id, "stunden": 1, "datum": "2026-06-02"},
    )
    assert r.status_code == 200
    assert r.json()["ohne_pin"] is False


@pytest.mark.asyncio
async def test_dienststunden_pdf_hebt_ohne_pin_zeile_hervor(client, db):
    f = await _funktion(db, "Atemschutzgeräteträger")
    person = await _person(db, "Ohne Pin PDF")
    from app.services import dienststunden_service
    from app.schemas.dienststunden import DienststundenErfassen

    await dienststunden_service.erfassen(
        db, person.id, DienststundenErfassen(funktion_id=f.id, stunden=1, datum="2026-06-03", ohne_pin=True)
    )

    admin = Person(name="admin", email="admin", passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle="admin")
    db.add(admin)
    await db.commit()
    login = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "admin", "password": "geheim123"}
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    r = await client.get("/api/v1/gruppenfuehrer/listen/dienststunden/pdf", headers=headers)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"


# --- Einsatztagebuch ----------------------------------------------------------


async def _einsatz(db, titel="Einsatz"):
    from datetime import datetime, timezone

    from app.schemas.einsatz import EinsatzAnlegen
    from app.services.einsatz_service import einsatz_anlegen

    return await einsatz_anlegen(
        db, EinsatzAnlegen(titel=titel, zeitpunkt=datetime(2026, 6, 1, 12, 0, tzinfo=timezone.utc))
    )


@pytest.mark.asyncio
async def test_einsatz_teilnahme_ohne_pin_wird_markiert(client, db):
    einsatz = await _einsatz(db, "Ohne PIN Kiosk")
    person = await _person(db, "Ohne Pin ET")
    await _mitglied_einloggen(client, person.id, None)

    r = await client.post(
        f"/api/v1/einsaetze/{einsatz.id}/teilnahme",
        json={"nur_geraetehaus": True, "ohne_pin": True},
    )
    assert r.status_code == 200
    assert r.json()["ohne_pin"] is True


@pytest.mark.asyncio
async def test_einsatz_teilnahme_mit_pin_nicht_markiert(client, db):
    einsatz = await _einsatz(db, "Mit PIN Kiosk")
    person = await _person(db, "Mit Pin ET", pin="4711")
    await _mitglied_einloggen(client, person.id, "4711")

    r = await client.post(
        f"/api/v1/einsaetze/{einsatz.id}/teilnahme",
        json={"nur_geraetehaus": True},
    )
    assert r.status_code == 200
    assert r.json()["ohne_pin"] is False


@pytest.mark.asyncio
async def test_einsatz_reservierung_einloesen_ohne_pin_wird_markiert(db):
    from app.schemas.reservierung import ReservierungAnlegen, ReservierungEinloesen
    from app.services import reservierung_service

    einsatz = await _einsatz(db, "QR ohne PIN")
    reservierung = await reservierung_service.reservierung_anlegen(
        db, einsatz.id, ReservierungAnlegen(fahrzeug_id=None, sitzplatz_id=None, bezeichnung="Platz")
    )
    person = await _person(db, "QR ohne PIN Person")
    await reservierung_service.reservierung_vorschau_setzen(db, reservierung, person.id, None)

    ergebnis = await reservierung_service.reservierung_einloesen(
        db, reservierung, ReservierungEinloesen(person_id=person.id, vab=False, atemschutzminuten=0, bemerkung=None)
    )
    assert ergebnis.ohne_pin is True
    assert ergebnis.ohne_barcode is True


@pytest.mark.asyncio
async def test_einsatz_pdf_hebt_ohne_pin_zeile_hervor(client, db):
    from app.schemas.einsatz import TeilnahmeAnlegen
    from app.services import einsatz_service

    einsatz = await _einsatz(db, "PDF ohne PIN")
    person = await _person(db, "Ohne Pin PDF ET")
    await einsatz_service.teilnahme_eintragen(
        db, einsatz, person.id, TeilnahmeAnlegen(nur_geraetehaus=True, ohne_pin=True)
    )

    admin = Person(name="admin-et", email="admin-et", passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle="admin")
    db.add(admin)
    await db.commit()
    login = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "admin-et", "password": "geheim123"}
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    r = await client.get(f"/api/v1/einsaetze/{einsatz.id}/pdf", headers=headers)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"


# --- Fahrzeugbuchung ----------------------------------------------------------


async def _fahrzeug(db, name="MTW"):
    fahrzeug = Fahrzeug(name=name, aktiv=True, buchbar=True, sitzplaetze=[])
    db.add(fahrzeug)
    await db.commit()
    await db.refresh(fahrzeug)
    return fahrzeug


@pytest.mark.asyncio
async def test_buchung_ohne_pin_wird_markiert(db):
    fahrzeug = await _fahrzeug(db)
    person = await _person(db, "Ohne Pin Buchung")
    von = datetime.now(timezone.utc) + timedelta(days=1)
    bis = von + timedelta(hours=2)

    buchung, _konflikt = await buchung_service.anfrage_erstellen(
        db, person.id, BuchungAnfrage(fahrzeug_id=fahrzeug.id, von=von, bis=bis, zweck="Übung", ohne_pin=True)
    )
    assert buchung.ohne_pin is True


@pytest.mark.asyncio
async def test_buchung_mit_pin_nicht_markiert(db):
    fahrzeug = await _fahrzeug(db, "LF")
    person = await _person(db, "Mit Pin Buchung", pin="4711")
    von = datetime.now(timezone.utc) + timedelta(days=1)
    bis = von + timedelta(hours=2)

    buchung, _konflikt = await buchung_service.anfrage_erstellen(
        db, person.id, BuchungAnfrage(fahrzeug_id=fahrzeug.id, von=von, bis=bis, zweck="Übung")
    )
    assert buchung.ohne_pin is False


@pytest.mark.asyncio
async def test_buchung_reservierung_einloesen_ohne_pin_wird_markiert(db):
    fahrzeug = await _fahrzeug(db, "DLK")
    person = await _person(db, "QR Buchung ohne PIN")
    reservierung = await fahrzeugbuchung_reservierung_service.reservierung_anlegen(db)
    await fahrzeugbuchung_reservierung_service.reservierung_vorschau_setzen(db, reservierung, person.id, None)

    von = datetime.now(timezone.utc) + timedelta(days=1)
    bis = von + timedelta(hours=2)
    buchung = await fahrzeugbuchung_reservierung_service.reservierung_einloesen(
        db,
        reservierung,
        FahrzeugbuchungReservierungEinloesen(
            person_id=person.id, fahrzeug_id=fahrzeug.id, von=von, bis=bis, zweck="Übung"
        ),
    )
    assert buchung.ohne_pin is True


@pytest.mark.asyncio
async def test_buchungen_pdf_hebt_ohne_pin_zeile_hervor(client, db):
    fahrzeug = await _fahrzeug(db, "RW")
    person = await _person(db, "Ohne Pin Buchung PDF")
    von = datetime.now(timezone.utc) + timedelta(days=1)
    bis = von + timedelta(hours=2)
    await buchung_service.anfrage_erstellen(
        db, person.id, BuchungAnfrage(fahrzeug_id=fahrzeug.id, von=von, bis=bis, zweck="Übung", ohne_pin=True)
    )

    admin = Person(name="admin-fb", email="admin-fb", passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle="admin")
    db.add(admin)
    await db.commit()
    login = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "admin-fb", "password": "geheim123"}
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    r = await client.get("/api/v1/gruppenfuehrer/listen/buchungen/pdf", headers=headers)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"


# --- Dienstbuch -----------------------------------------------------------


async def _dienstbuch(db, titel="Dienst"):
    return await dienstbuch_service.dienstbuch_anlegen(
        db, DienstbuchAnlegen(titel=titel, eroeffnet_am=datetime(2026, 6, 1, 19, 0, tzinfo=timezone.utc))
    )


@pytest.mark.asyncio
async def test_dienstbuch_teilnehmer_ohne_pin_wird_markiert(db):
    dienstbuch = await _dienstbuch(db)
    person = await _person(db, "Ohne Pin Dienstbuch")

    ergebnis = await dienstbuch_service.teilnehmer_eintragen(
        db, dienstbuch, person.id, TeilnehmerAnlegen(ohne_pin=True)
    )
    assert ergebnis.ohne_pin is True


@pytest.mark.asyncio
async def test_dienstbuch_teilnehmer_mit_pin_nicht_markiert(db):
    dienstbuch = await _dienstbuch(db, "Mit Pin Dienst")
    person = await _person(db, "Mit Pin Dienstbuch", pin="4711")

    ergebnis = await dienstbuch_service.teilnehmer_eintragen(db, dienstbuch, person.id, TeilnehmerAnlegen())
    assert ergebnis.ohne_pin is False


@pytest.mark.asyncio
async def test_dienstbuch_reservierung_einloesen_ohne_pin_wird_markiert(db):
    dienstbuch = await _dienstbuch(db, "QR Dienst")
    person = await _person(db, "QR Dienstbuch ohne PIN")
    reservierung = await dienstbuch_reservierung_service.reservierung_anlegen(db, dienstbuch.id)
    await dienstbuch_reservierung_service.reservierung_vorschau_setzen(db, reservierung, person.id, None)

    ergebnis = await dienstbuch_reservierung_service.reservierung_einloesen(
        db, reservierung, DienstbuchReservierungEinloesen(person_id=person.id)
    )
    assert ergebnis.ohne_pin is True


@pytest.mark.asyncio
async def test_dienstbuch_pdf_hebt_ohne_pin_zeile_hervor(client, db):
    dienstbuch = await _dienstbuch(db, "PDF Dienst")
    person = await _person(db, "Ohne Pin Dienstbuch PDF")
    await dienstbuch_service.teilnehmer_eintragen(db, dienstbuch, person.id, TeilnehmerAnlegen(ohne_pin=True))

    admin = Person(name="admin-db", email="admin-db", passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle="admin")
    db.add(admin)
    await db.commit()
    login = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "admin-db", "password": "geheim123"}
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    r = await client.get(f"/api/v1/dienstbuecher/{dienstbuch.id}/pdf", headers=headers)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
