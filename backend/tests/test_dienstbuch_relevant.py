"""Tests für die „relevant"-Markierung von Dienstbüchern
(PATCH /dienstbuecher/{id}/relevant, Moderator)."""

from datetime import datetime, timezone

import pytest

from app.core.security import hash_secret
from app.models.person import Person
from app.schemas.dienstbuch import DienstbuchAnlegen
from app.services import berechtigungs_service, dienstbuch_service, modul_service


async def _moderator_token(client, db):
    # Dienstbuch-Moderator-Endpunkte sind granular geschützt (require_modul_zugriff);
    # der Test-Gruppenführer bekommt daher das „dienstbuch"-Recht.
    gf = Person(name="gf", passwort_hash=hash_secret("geheim123"), moderator_rolle="gruppenfuehrer")
    db.add(gf)
    await db.commit()
    await db.refresh(gf)
    await modul_service.ensure_module(db)
    await berechtigungs_service.set_berechtigung(db, gf.id, "dienstbuch", True)
    login = await client.post(
        "/api/v1/auth/moderator/login", data={"username": "gf", "password": "geheim123"}
    )
    return login.json()["access_token"]


async def _dienstbuch(db):
    return await dienstbuch_service.dienstbuch_anlegen(
        db,
        DienstbuchAnlegen(titel="Übung", eroeffnet_am=datetime(2026, 7, 4, 18, 0, tzinfo=timezone.utc)),
    )


@pytest.mark.asyncio
async def test_relevant_setzen_und_zuruecksetzen(client, db):
    token = await _moderator_token(client, db)
    h = {"Authorization": f"Bearer {token}"}
    dienstbuch = await _dienstbuch(db)

    # Default: nicht relevant
    r = await client.get(f"/api/v1/dienstbuecher/{dienstbuch.id}", headers=h)
    assert r.status_code == 200
    assert r.json()["relevant"] is False

    # Als relevant markieren
    r = await client.patch(
        f"/api/v1/dienstbuecher/{dienstbuch.id}/relevant", headers=h, json={"relevant": True}
    )
    assert r.status_code == 200
    assert r.json()["relevant"] is True

    # Persistiert – über einen frischen GET-Request (eigene Session) verifiziert
    r = await client.get(f"/api/v1/dienstbuecher/{dienstbuch.id}", headers=h)
    assert r.json()["relevant"] is True

    # Wieder zurücksetzen
    r = await client.patch(
        f"/api/v1/dienstbuecher/{dienstbuch.id}/relevant", headers=h, json={"relevant": False}
    )
    assert r.status_code == 200
    assert r.json()["relevant"] is False


@pytest.mark.asyncio
async def test_relevant_ohne_login_abgelehnt(client, db):
    dienstbuch = await _dienstbuch(db)
    r = await client.patch(
        f"/api/v1/dienstbuecher/{dienstbuch.id}/relevant", json={"relevant": True}
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_relevant_unbekanntes_dienstbuch_404(client, db):
    token = await _moderator_token(client, db)
    h = {"Authorization": f"Bearer {token}"}
    r = await client.patch("/api/v1/dienstbuecher/999999/relevant", headers=h, json={"relevant": True})
    assert r.status_code == 404


# --- Relevante-Dienste-Übersicht (Mindest-Dienstbeteiligung) ------------------


async def _dienstbuch_am(db, tag: datetime, relevant: bool):
    from app.services.dienstbuch_service import relevant_setzen

    db_obj = await dienstbuch_service.dienstbuch_anlegen(
        db, DienstbuchAnlegen(titel="Dienst", eroeffnet_am=tag)
    )
    if relevant:
        await relevant_setzen(db, db_obj, True)
    return db_obj


async def _teilnahme(db, dienstbuch_id: int, person_id: int):
    from app.models.dienstbuch import DienstbuchPerson

    db.add(DienstbuchPerson(dienstbuch_id=dienstbuch_id, person_id=person_id))
    await db.commit()


@pytest.mark.asyncio
async def test_relevante_uebersicht_zaehlt_je_person(client, db):

    token = await _moderator_token(client, db)
    h = {"Authorization": f"Bearer {token}"}

    person = Person(name="Max Muster")
    db.add(person)
    await db.commit()
    await db.refresh(person)

    d1 = await _dienstbuch_am(db, datetime(2026, 3, 1, 18, tzinfo=timezone.utc), relevant=True)
    d2 = await _dienstbuch_am(db, datetime(2026, 6, 1, 18, tzinfo=timezone.utc), relevant=True)
    d3 = await _dienstbuch_am(db, datetime(2026, 6, 5, 18, tzinfo=timezone.utc), relevant=False)
    for d in (d1, d2, d3):
        await _teilnahme(db, d.id, person.id)

    # Nur relevante zählen -> 2
    r = await client.get("/api/v1/dienstbuecher/relevante-uebersicht", headers=h)
    assert r.status_code == 200
    eintrag = next(e for e in r.json() if e["person_id"] == person.id)
    assert eintrag["anzahl"] == 2

    # Zeitraumfilter: nur ab Mai -> 1 relevanter Dienst
    r = await client.get("/api/v1/dienstbuecher/relevante-uebersicht?von=2026-05-01", headers=h)
    eintrag = next(e for e in r.json() if e["person_id"] == person.id)
    assert eintrag["anzahl"] == 1


@pytest.mark.asyncio
async def test_relevante_uebersicht_ohne_login_abgelehnt(client, db):
    r = await client.get("/api/v1/dienstbuecher/relevante-uebersicht")
    assert r.status_code == 401


# --- Anwesenheitsquote pro Person --------------------------------------------


@pytest.mark.asyncio
async def test_anwesenheit_quote(client, db):

    token = await _moderator_token(client, db)
    h = {"Authorization": f"Bearer {token}"}

    p1 = Person(name="Anna")
    p2 = Person(name="Bert")
    db.add_all([p1, p2])
    await db.commit()
    await db.refresh(p1)
    await db.refresh(p2)

    # 4 Dienstbücher; Anna in 3, Bert in 1
    d1 = await _dienstbuch_am(db, datetime(2026, 2, 1, 18, tzinfo=timezone.utc), relevant=False)
    d2 = await _dienstbuch_am(db, datetime(2026, 3, 1, 18, tzinfo=timezone.utc), relevant=False)
    d3 = await _dienstbuch_am(db, datetime(2026, 4, 1, 18, tzinfo=timezone.utc), relevant=False)
    d4 = await _dienstbuch_am(db, datetime(2026, 5, 1, 18, tzinfo=timezone.utc), relevant=False)
    for d in (d1, d2, d3):
        await _teilnahme(db, d.id, p1.id)
    await _teilnahme(db, d4.id, p2.id)

    r = await client.get("/api/v1/dienstbuecher/anwesenheit", headers=h)
    assert r.status_code == 200
    daten = r.json()
    assert daten["gesamt"] == 4
    quoten = {e["person_id"]: e for e in daten["personen"]}
    assert quoten[p1.id]["teilgenommen"] == 3 and quoten[p1.id]["quote"] == 75.0
    assert quoten[p2.id]["teilgenommen"] == 1 and quoten[p2.id]["quote"] == 25.0

    # Zeitraum ab April: nur d3 + d4 -> gesamt 2, Anna 1 (50%)
    r = await client.get("/api/v1/dienstbuecher/anwesenheit?von=2026-04-01", headers=h)
    daten = r.json()
    assert daten["gesamt"] == 2
    quoten = {e["person_id"]: e for e in daten["personen"]}
    assert quoten[p1.id]["quote"] == 50.0


@pytest.mark.asyncio
async def test_anwesenheit_ohne_login_abgelehnt(client, db):
    r = await client.get("/api/v1/dienstbuecher/anwesenheit")
    assert r.status_code == 401
