"""Tests für die Aktivitäts-Ampel (ampel_service): Statusberechnung je Modul,
einmalige Benachrichtigung beim Überschreiten, Endpunkt, inaktiv-Verhalten."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.core.security import hash_secret
from app.models.einsatz import EinsatzPerson
from app.models.moderator import Moderator
from app.models.person import Person
from app.schemas.einsatz import EinsatzAnlegen
from app.services import ampel_service, einsatz_service, stammdaten_service
from app.services.config_service import config_service


async def _person(db, name, inaktiv=False):
    p = Person(name=name, inaktiv=inaktiv)
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


async def _einsatz_teilnahme(db, person, tage_alt):
    einsatz = await einsatz_service.einsatz_anlegen(
        db,
        EinsatzAnlegen(
            titel="Einsatz", zeitpunkt=datetime.now(timezone.utc) - timedelta(days=tage_alt)
        ),
    )
    db.add(EinsatzPerson(einsatz_id=einsatz.id, person_id=person.id))
    await db.commit()


async def _schwellen(db, gelb=30, rot=60):
    await config_service.set(db, "personal_ampel_gelb_tage", gelb)
    await config_service.set(db, "personal_ampel_rot_tage", rot)


@pytest.mark.asyncio
async def test_ampel_status_je_person(db):
    await _schwellen(db)
    rot_p = await _person(db, "Rot")
    await _einsatz_teilnahme(db, rot_p, 70)
    gelb_p = await _person(db, "Gelb")
    await _einsatz_teilnahme(db, gelb_p, 40)
    gruen_p = await _person(db, "Gruen")
    await _einsatz_teilnahme(db, gruen_p, 5)
    inaktiv_p = await _person(db, "Inaktiv", inaktiv=True)
    await _einsatz_teilnahme(db, inaktiv_p, 70)
    neu_p = await _person(db, "Neu")  # kein Eintrag → Fallback erstellt_am (heute)

    status = {e.person_id: e.status for e in await ampel_service.ampel_uebersicht(db)}
    assert status[rot_p.id] == "rot"
    assert status[gelb_p.id] == "gelb"
    assert status[gruen_p.id] == "gruen"
    assert status[inaktiv_p.id] == "inaktiv"
    assert status[neu_p.id] == "gruen"


@pytest.mark.asyncio
async def test_deaktiviertes_modul_wird_nicht_gezaehlt(db):
    await _schwellen(db)
    p = await _person(db, "Nur Einsatz vor 70 Tagen")
    await _einsatz_teilnahme(db, p, 70)

    # Einsatztagebuch aus → alter Einsatz zählt nicht mehr, Fallback = erstellt_am
    await config_service.set(db, "modul_einsatztagebuch_aktiv", False)
    status = {e.person_id: e.status for e in await ampel_service.ampel_uebersicht(db)}
    assert status[p.id] == "gruen"


@pytest.mark.asyncio
async def test_benachrichtigung_einmalig_und_eskalation(db, monkeypatch):
    gesendet = []

    async def fake_benachrichtige(_db, ereignis, **kw):
        gesendet.append((ereignis, kw))

    monkeypatch.setattr(ampel_service.notifier_service, "benachrichtige", fake_benachrichtige)

    await _schwellen(db, gelb=30, rot=60)
    p = await _person(db, "P")
    await _einsatz_teilnahme(db, p, 40)  # gelb

    assert await ampel_service.ampel_benachrichtigungen_versenden(db) == 1
    assert gesendet[-1][0] == "benachrichtigung_person_ampel_gelb"
    assert p.ampel_gemeldet == "gelb"

    # Zweiter Lauf: kein erneuter Versand
    gesendet.clear()
    assert await ampel_service.ampel_benachrichtigungen_versenden(db) == 0

    # Eskalation gelb → rot (rote Schwelle senken, 40 Tage ≥ 35)
    await config_service.set(db, "personal_ampel_rot_tage", 35)
    assert await ampel_service.ampel_benachrichtigungen_versenden(db) == 1
    assert gesendet[-1][0] == "benachrichtigung_person_ampel_rot"
    assert p.ampel_gemeldet == "rot"


@pytest.mark.asyncio
async def test_benachrichtigung_sammelt_alle_personen(db, monkeypatch):
    """Regression: Mehrere überfällige Personen lösen NUR EINE Benachrichtigung je
    Stufe aus (die alle betroffenen Personen auflistet), statt einer Nachricht pro
    Person – sonst gibt es bei vielen Überfälligen eine Mail-/Telegram-Flut."""
    gesendet = []

    async def fake_benachrichtige(_db, ereignis, nachricht_override=None, **kw):
        gesendet.append((ereignis, nachricht_override))

    monkeypatch.setattr(ampel_service.notifier_service, "benachrichtige", fake_benachrichtige)

    await _schwellen(db, gelb=30, rot=60)
    namen = ["Anna", "Bea", "Cara"]
    for n in namen:
        p = await _person(db, n)
        await _einsatz_teilnahme(db, p, 40)  # alle gelb (40 ≥ 30)

    # Genau EINE Benachrichtigung trotz drei überfälliger Personen …
    assert await ampel_service.ampel_benachrichtigungen_versenden(db) == 1
    assert len(gesendet) == 1
    ereignis, nachricht = gesendet[0]
    assert ereignis == "benachrichtigung_person_ampel_gelb"
    # … die alle drei Namen enthält.
    assert nachricht is not None
    for n in namen:
        assert n in nachricht


@pytest.mark.asyncio
async def test_benachrichtigung_gelb_und_rot_getrennt(db, monkeypatch):
    """Gelbe und rote Überschreitungen sind eigene, separat abonnierbare Ereignisse
    → je eine Sammel-Benachrichtigung (also höchstens zwei), nicht mehr."""
    gesendet = []

    async def fake_benachrichtige(_db, ereignis, nachricht_override=None, **kw):
        gesendet.append((ereignis, nachricht_override))

    monkeypatch.setattr(ampel_service.notifier_service, "benachrichtige", fake_benachrichtige)

    await _schwellen(db, gelb=30, rot=60)
    for n in ("Gelb1", "Gelb2"):
        await _einsatz_teilnahme(db, await _person(db, n), 40)  # gelb
    for n in ("Rot1", "Rot2", "Rot3"):
        await _einsatz_teilnahme(db, await _person(db, n), 70)  # rot

    # Zwei Personen gelb + drei rot → genau zwei Benachrichtigungen.
    assert await ampel_service.ampel_benachrichtigungen_versenden(db) == 2
    ereignisse = {e for e, _ in gesendet}
    assert ereignisse == {"benachrichtigung_person_ampel_gelb", "benachrichtigung_person_ampel_rot"}


@pytest.mark.asyncio
async def test_benachrichtigung_reset_bei_neuer_aktivitaet(db, monkeypatch):
    gesendet = []

    async def fake_benachrichtige(_db, ereignis, **kw):
        gesendet.append((ereignis, kw))

    monkeypatch.setattr(ampel_service.notifier_service, "benachrichtige", fake_benachrichtige)

    await _schwellen(db, gelb=30, rot=60)
    p = await _person(db, "P")
    await _einsatz_teilnahme(db, p, 70)  # rot
    assert await ampel_service.ampel_benachrichtigungen_versenden(db) == 1
    assert p.ampel_gemeldet == "rot"

    # Neue Aktivität → gruen, kein Versand, Stufe zurückgesetzt
    gesendet.clear()
    await _einsatz_teilnahme(db, p, 0)
    assert await ampel_service.ampel_benachrichtigungen_versenden(db) == 0
    assert p.ampel_gemeldet == "gruen"


@pytest.mark.asyncio
async def test_ampel_endpunkt(client, db):
    await _schwellen(db)
    db.add(Moderator(username="gf", passwort_hash=hash_secret("geheim123"), rolle="gruppenfuehrer"))
    await db.commit()
    login = await client.post(
        "/api/v1/auth/moderator/login", data={"username": "gf", "password": "geheim123"}
    )
    token = login.json()["access_token"]

    p = await _person(db, "Rot")
    await _einsatz_teilnahme(db, p, 70)

    r = await client.get(
        "/api/v1/moderator/stammdaten/personen/ampel",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    eintrag = next(e for e in r.json() if e["person_id"] == p.id)
    assert eintrag["status"] == "rot"


@pytest.mark.asyncio
async def test_person_inaktiv_persistiert(client, db):
    db.add(Moderator(username="admin", passwort_hash=hash_secret("geheim123"), rolle="admin"))
    await db.commit()
    login = await client.post(
        "/api/v1/auth/moderator/login", data={"username": "admin", "password": "geheim123"}
    )
    token = login.json()["access_token"]
    p = await _person(db, "Max Muster")

    r = await client.put(
        f"/api/v1/moderator/stammdaten/personen/{p.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"inaktiv": True},
    )
    assert r.status_code == 200
    assert r.json()["inaktiv"] is True


@pytest.mark.asyncio
async def test_auto_loeschung_unabhaengig_von_inaktiv(db):
    """Die Inaktiv-Markierung steuert nur die Ampel und beeinflusst die separate
    automatische Inaktivitäts-Löschung bewusst NICHT."""
    await config_service.set(db, "personen_inaktivitaet_tage", 1)
    alt = datetime.now(timezone.utc) - timedelta(days=100)

    aktiv = await _person(db, "Ohne Markierung")
    aktiv.erstellt_am = alt
    inaktiv = await _person(db, "Inaktiv markiert", inaktiv=True)
    inaktiv.erstellt_am = alt
    await db.commit()

    await stammdaten_service.personen_inaktivitaet_pruefen(db)

    # Beide werden gelöscht – die Inaktiv-Markierung schützt nicht davor.
    verbleibend = {p.name for p in (await db.execute(select(Person))).scalars().all()}
    assert "Ohne Markierung" not in verbleibend
    assert "Inaktiv markiert" not in verbleibend
