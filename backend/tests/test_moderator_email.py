"""E-Mail-Adresse pro Moderatoren-Zugang (Etappe G1): anlegen mit E-Mail,
nachträglich setzen/entfernen, in der Liste enthalten."""

import pytest

from app.core.security import hash_secret
from app.models.moderator import Moderator


async def _admin_headers(client, db):
    db.add(Moderator(username="admin", passwort_hash=hash_secret("geheim123"), rolle="admin"))
    await db.commit()
    r = await client.post(
        "/api/v1/auth/moderator/login", data={"username": "admin", "password": "geheim123"}
    )
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.mark.asyncio
async def test_anlegen_mit_email(client, db):
    h = await _admin_headers(client, db)
    r = await client.post(
        "/api/v1/moderator/einstellungen/moderatoren",
        json={"username": "gf", "passwort": "geheim123", "rolle": "gruppenfuehrer", "email": "gf@example.org"},
        headers=h,
    )
    assert r.status_code == 201
    assert r.json()["email"] == "gf@example.org"


@pytest.mark.asyncio
async def test_anlegen_ohne_email_ist_none(client, db):
    h = await _admin_headers(client, db)
    r = await client.post(
        "/api/v1/moderator/einstellungen/moderatoren",
        json={"username": "gf2", "passwort": "geheim123", "rolle": "gruppenfuehrer"},
        headers=h,
    )
    assert r.status_code == 201
    assert r.json()["email"] is None


@pytest.mark.asyncio
async def test_email_setzen_und_entfernen(client, db):
    h = await _admin_headers(client, db)
    angelegt = await client.post(
        "/api/v1/moderator/einstellungen/moderatoren",
        json={"username": "gf3", "passwort": "geheim123", "rolle": "gruppenfuehrer"},
        headers=h,
    )
    mid = angelegt.json()["id"]

    gesetzt = await client.patch(
        f"/api/v1/moderator/einstellungen/moderatoren/{mid}",
        json={"email": "  neu@example.org  "},
        headers=h,
    )
    assert gesetzt.status_code == 200
    assert gesetzt.json()["email"] == "neu@example.org"  # getrimmt

    entfernt = await client.patch(
        f"/api/v1/moderator/einstellungen/moderatoren/{mid}",
        json={"email": ""},
        headers=h,
    )
    assert entfernt.status_code == 200
    assert entfernt.json()["email"] is None  # leer → entfernt

    liste = await client.get("/api/v1/moderator/einstellungen/moderatoren", headers=h)
    assert any(m["id"] == mid and m["email"] is None for m in liste.json())
