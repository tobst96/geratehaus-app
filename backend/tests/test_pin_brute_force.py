"""Tests für den PIN-Brute-Force-Schutz (Name+PIN-Login): Fehlversuchszähler,
temporäre Sperre nach zu vielen Fehlversuchen, automatische Freigabe nach Ablauf
und manuelles Entsperren durch Moderatoren."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.core.security import hash_secret
from app.models.person import Person
from app.models.person_ereignis import PersonEreignis
from app.services import stammdaten_service
from app.services.config_service import config_service


async def _person_mit_pin(db, name="Max Muster", pin="1234"):
    person = Person(name=name)
    db.add(person)
    await db.commit()
    await db.refresh(person)
    await stammdaten_service.person_pin_setzen(db, person, pin)
    return person


@pytest.mark.asyncio
async def test_sperre_nach_max_fehlversuchen(db):
    await config_service.set(db, "pin_max_fehlversuche", 5)
    await config_service.set(db, "pin_sperre_minuten", 15)
    person = await _person_mit_pin(db, pin="1234")

    # 4 Fehlversuche: noch nicht gesperrt.
    for _ in range(4):
        assert await stammdaten_service.pin_login_versuch(db, person, "0000") is False
    assert person.pin_gesperrt_bis is None
    assert person.pin_fehlversuche == 4

    # 5. Fehlversuch -> Sperre gesetzt, Zähler zurück.
    assert await stammdaten_service.pin_login_versuch(db, person, "0000") is False
    assert person.pin_gesperrt_bis is not None
    assert person.pin_fehlversuche == 0

    # Solange gesperrt wird sogar der KORREKTE PIN abgewiesen.
    with pytest.raises(stammdaten_service.PinGesperrtError):
        await stammdaten_service.pin_login_versuch(db, person, "1234")

    # Sperre in der Personen-Timeline protokolliert.
    ereignisse = (
        await db.execute(select(PersonEreignis).where(PersonEreignis.person_id == person.id))
    ).scalars().all()
    assert "pin_gesperrt" in {e.typ for e in ereignisse}


@pytest.mark.asyncio
async def test_sperre_laeuft_nach_ablauf_automatisch_ab(db):
    await config_service.set(db, "pin_max_fehlversuche", 3)
    person = await _person_mit_pin(db, pin="1234")
    for _ in range(3):
        await stammdaten_service.pin_login_versuch(db, person, "9999")
    assert person.pin_gesperrt_bis is not None

    # Sperre künstlich in die Vergangenheit setzen -> wieder frei, korrekt einloggbar.
    person.pin_gesperrt_bis = datetime.now(timezone.utc) - timedelta(minutes=1)
    await db.commit()
    assert await stammdaten_service.pin_login_versuch(db, person, "1234") is True
    assert person.pin_gesperrt_bis is None
    assert person.pin_fehlversuche == 0


@pytest.mark.asyncio
async def test_korrekter_pin_setzt_zaehler_zurueck(db):
    await config_service.set(db, "pin_max_fehlversuche", 5)
    person = await _person_mit_pin(db, pin="1234")
    await stammdaten_service.pin_login_versuch(db, person, "0000")
    await stammdaten_service.pin_login_versuch(db, person, "0000")
    assert person.pin_fehlversuche == 2
    assert await stammdaten_service.pin_login_versuch(db, person, "1234") is True
    assert person.pin_fehlversuche == 0
    assert person.pin_gesperrt_bis is None


@pytest.mark.asyncio
async def test_sperre_deaktivierbar_ueber_config(db):
    await config_service.set(db, "pin_max_fehlversuche", 0)
    person = await _person_mit_pin(db, pin="1234")
    for _ in range(8):
        assert await stammdaten_service.pin_login_versuch(db, person, "0000") is False
    # Bei 0 wird nie gesperrt.
    assert person.pin_gesperrt_bis is None


@pytest.mark.asyncio
async def test_api_sperre_liefert_429_und_moderator_entsperrt(client, db):
    await config_service.set(db, "pin_max_fehlversuche", 3)
    await config_service.set(db, "pin_sperre_minuten", 15)
    person = await _person_mit_pin(db, name="Bea Test", pin="4711")

    # Drei falsche Versuche über die API (letzter setzt die Sperre).
    for _ in range(3):
        r = await client.post("/api/v1/auth/name-pin", json={"person_id": person.id, "pin": "0000"})
        assert r.status_code == 401

    # Jetzt gesperrt: selbst der korrekte PIN wird mit 429 abgewiesen.
    r = await client.post("/api/v1/auth/name-pin", json={"person_id": person.id, "pin": "4711"})
    assert r.status_code == 429

    # Moderator (Gruppenführer) entsperrt manuell.
    db.add(Person(name="gf", passwort_hash=hash_secret("geheim123"), moderator_rolle="gruppenfuehrer"))
    await db.commit()
    login = await client.post(
        "/api/v1/auth/moderator/login", data={"username": "gf", "password": "geheim123"}
    )
    token = login.json()["access_token"]
    r = await client.post(
        f"/api/v1/moderator/stammdaten/personen/{person.id}/pin-entsperren",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert r.json()["pin_gesperrt_bis"] is None

    # Danach wieder normal einloggbar.
    r = await client.post("/api/v1/auth/name-pin", json={"person_id": person.id, "pin": "4711"})
    assert r.status_code == 200
    assert r.json()["name"] == "Bea Test"


@pytest.mark.asyncio
async def test_pruefen_endpunkt_zaehlt_ebenfalls_mit(client, db):
    """Der Vorschau-Endpunkt darf die Sperre nicht umgehen: auch dort zählen
    Fehlversuche, und bei aktiver Sperre kommt 429."""
    await config_service.set(db, "pin_max_fehlversuche", 3)
    person = await _person_mit_pin(db, name="Cara Test", pin="4711")

    for _ in range(3):
        r = await client.post(
            "/api/v1/auth/name-pin/pruefen", json={"person_id": person.id, "pin": "0000"}
        )
        assert r.status_code == 401
    r = await client.post(
        "/api/v1/auth/name-pin/pruefen", json={"person_id": person.id, "pin": "4711"}
    )
    assert r.status_code == 429
