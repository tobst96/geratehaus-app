"""Persönliches Mitglieder-Dashboard (eigene Kennzahlen) + Profil-Selbstverwaltung."""

from datetime import datetime, timezone

import pytest

from app.core.security import hash_secret, verify_secret
from app.models.dienstbuch import Dienstbuch, DienstbuchPerson
from app.models.einsatz import Einsatz, EinsatzPerson
from app.models.person import Person


async def _person(db, name="Max Muster"):
    p = Person(name=name, passwort_hash=hash_secret("geheim123"), email="m@example.org")
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


async def _login(client, name="Max Muster"):
    r = await client.post(
        "/api/v1/auth/mitglied-login", json={"name": name, "passwort": "geheim123"}
    )
    assert r.status_code == 200


async def _einsatz_mit_teilnahme(db, person_id, titel="B2 Zimmerbrand", jahr=None):
    zeit = datetime.now(timezone.utc) if jahr is None else datetime(jahr, 6, 1, tzinfo=timezone.utc)
    einsatz = Einsatz(titel=titel, zeitpunkt=zeit)
    db.add(einsatz)
    await db.commit()
    await db.refresh(einsatz)
    db.add(EinsatzPerson(einsatz_id=einsatz.id, person_id=person_id))
    await db.commit()
    return einsatz


@pytest.mark.asyncio
async def test_uebersicht_zaehlt_nur_eigene_daten(client, db):
    ich = await _person(db)
    anderer = await _person(db, name="Erika Anders")
    await _einsatz_mit_teilnahme(db, ich.id, "Mein Einsatz")
    await _einsatz_mit_teilnahme(db, anderer.id, "Fremder Einsatz")
    # Dienst dieses Jahr
    db_eintrag = Dienstbuch(titel="Übungsdienst", eroeffnet_am=datetime.now(timezone.utc))
    db.add(db_eintrag)
    await db.commit()
    await db.refresh(db_eintrag)
    db.add(DienstbuchPerson(dienstbuch_id=db_eintrag.id, person_id=ich.id))
    await db.commit()

    await _login(client)
    r = await client.get("/api/v1/mitglied/uebersicht")
    assert r.status_code == 200
    body = r.json()
    assert body["einsaetze_jahr"] == 1  # nur der eigene, nicht der fremde
    assert body["dienste_jahr"] == 1
    assert [e["titel"] for e in body["letzte_einsaetze"]] == ["Mein Einsatz"]


@pytest.mark.asyncio
async def test_uebersicht_zaehlt_nur_dieses_jahr(client, db):
    ich = await _person(db)
    await _einsatz_mit_teilnahme(db, ich.id, "Dieses Jahr")
    await _einsatz_mit_teilnahme(db, ich.id, "Altjahr", jahr=2019)
    await _login(client)
    r = await client.get("/api/v1/mitglied/uebersicht")
    assert r.json()["einsaetze_jahr"] == 1


@pytest.mark.asyncio
async def test_uebersicht_ohne_login_401(client, db):
    r = await client.get("/api/v1/mitglied/uebersicht")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_mein_profil_aktualisieren(client, db):
    await _person(db)
    await _login(client)
    r = await client.put(
        "/api/v1/auth/mein-profil", json={"email": "neu@example.org", "benachrichtigungen_aktiv": True}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "neu@example.org"
    assert body["benachrichtigungen_aktiv"] is True
    assert body["passwort_gesetzt"] is True


@pytest.mark.asyncio
async def test_mein_passwort_aendern(client, db):
    ich = await _person(db)
    await _login(client)
    r = await client.post("/api/v1/auth/mein-passwort", json={"passwort": "ganzNeu12"})
    assert r.status_code == 204
    await db.refresh(ich)
    assert verify_secret("ganzNeu12", ich.passwort_hash)
