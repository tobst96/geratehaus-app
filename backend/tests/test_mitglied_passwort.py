"""Persönlicher Mitglieder-Login per Passwort + „Passwort setzen"-Link."""

import pytest

from app.core.security import hash_secret
from app.models.person import Person
from app.services import passwort_service


async def _person(db, name="Max Muster", passwort=None, email="max@example.org"):
    p = Person(name=name, email=email)
    if passwort:
        p.passwort_hash = hash_secret(passwort)
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


@pytest.mark.asyncio
async def test_login_mit_passwort_setzt_cookie(client, db):
    await _person(db, passwort="geheim123")
    r = await client.post(
        "/api/v1/auth/mitglied-login", json={"email": "max@example.org", "passwort": "geheim123"}
    )
    assert r.status_code == 200
    assert r.json()["name"] == "Max Muster"
    assert "geraetehaus_name" in r.cookies


@pytest.mark.asyncio
async def test_login_falsches_passwort_401(client, db):
    await _person(db, passwort="geheim123")
    r = await client.post(
        "/api/v1/auth/mitglied-login", json={"email": "max@example.org", "passwort": "falsch"}
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_login_ohne_gesetztes_passwort_401(client, db):
    await _person(db, passwort=None)
    r = await client.post(
        "/api/v1/auth/mitglied-login", json={"email": "max@example.org", "passwort": "irgendwas"}
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_passwort_setzen_per_link_dann_login(client, db):
    p = await _person(db, passwort=None)
    token = await passwort_service.token_erstellen(db, p.id)

    info = await client.get(f"/api/v1/passwort-setzen/{token.token}")
    assert info.status_code == 200
    assert info.json() == {"name": "Max Muster", "gueltig": True}

    r = await client.post(
        f"/api/v1/passwort-setzen/{token.token}", json={"passwort": "neuesGeheim1"}
    )
    assert r.status_code == 204

    login = await client.post(
        "/api/v1/auth/mitglied-login", json={"email": "max@example.org", "passwort": "neuesGeheim1"}
    )
    assert login.status_code == 200


@pytest.mark.asyncio
async def test_passwort_setzen_token_verbraucht_410(client, db):
    p = await _person(db, passwort=None)
    token = await passwort_service.token_erstellen(db, p.id)
    await client.post(f"/api/v1/passwort-setzen/{token.token}", json={"passwort": "neuesGeheim1"})
    r2 = await client.post(
        f"/api/v1/passwort-setzen/{token.token}", json={"passwort": "andersGeheim1"}
    )
    assert r2.status_code == 410


@pytest.mark.asyncio
async def test_passwort_zu_kurz_422(client, db):
    p = await _person(db, passwort=None)
    token = await passwort_service.token_erstellen(db, p.id)
    r = await client.post(f"/api/v1/passwort-setzen/{token.token}", json={"passwort": "kurz"})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_passwort_anfordern_immer_202(client, db):
    # Unbekannte E-Mail → trotzdem 202 (kein Enumeration-Leak).
    r = await client.post(
        "/api/v1/auth/mitglied-passwort-anfordern", json={"email": "gibt-es-nicht@example.org"}
    )
    assert r.status_code == 202
