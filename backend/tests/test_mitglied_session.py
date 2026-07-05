"""Tests für die signierte Mitglieder-Session (P0 Phase 2): das Namens-Cookie ist
nicht mehr fälschbar, wird nur nach echter Identifikation ausgestellt und der
PIN-lose `/auth/name`-Endpunkt ist entfernt."""

import pytest

from app.core import mitglied_session
from app.models.person import Person
from app.services import stammdaten_service


def test_signieren_und_lesen_roundtrip():
    token = mitglied_session.signiere_name("Max Muster")
    assert token != "Max Muster"  # nicht Klartext
    assert mitglied_session.lese_name(token) == "Max Muster"


def test_gefaelschte_oder_leere_werte():
    assert mitglied_session.lese_name(None) is None
    assert mitglied_session.lese_name("") is None
    assert mitglied_session.lese_name("Max Muster") is None  # unsigniert
    assert mitglied_session.lese_name("abc.def.ghi") is None  # manipuliert


@pytest.mark.asyncio
async def test_mein_profil_mit_signiertem_cookie(client, db):
    person = Person(name="Signed User")
    db.add(person)
    await db.commit()
    cookie = mitglied_session.signiere_name("Signed User")
    r = await client.get(
        "/api/v1/auth/mein-profil", headers={"Cookie": f"geraetehaus_name={cookie}"}
    )
    assert r.status_code == 200
    assert r.json()["name"] == "Signed User"


@pytest.mark.asyncio
async def test_mein_profil_ohne_gueltiges_cookie(client, db):
    r = await client.get(
        "/api/v1/auth/mein-profil", headers={"Cookie": "geraetehaus_name=gefaelscht"}
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_signiertes_cookie_ohne_person_401(client, db):
    cookie = mitglied_session.signiere_name("Gibt Es Nicht")
    r = await client.get(
        "/api/v1/auth/mein-profil", headers={"Cookie": f"geraetehaus_name={cookie}"}
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_name_pin_login_setzt_signierte_session(client, db):
    person = Person(name="Login User")
    db.add(person)
    await db.commit()
    await db.refresh(person)
    await stammdaten_service.person_pin_setzen(db, person, "4711")

    r = await client.post("/api/v1/auth/name-pin", json={"person_id": person.id, "pin": "4711"})
    assert r.status_code == 200
    cookie_wert = r.cookies.get("geraetehaus_name")
    assert cookie_wert is not None
    assert mitglied_session.lese_name(cookie_wert) == "Login User"


@pytest.mark.asyncio
async def test_pin_loser_auth_name_endpunkt_entfernt(client, db):
    r = await client.post("/api/v1/auth/name", json={"name": "Beliebig"})
    assert r.status_code in (404, 405)
