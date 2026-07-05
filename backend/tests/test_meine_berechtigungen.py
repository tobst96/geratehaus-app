"""Tests für die eigenen Modul-Rechte (Grundlage der Frontend-Guards):
Service `berechtigungs_service.meine_keys` und der Endpunkt
`GET /moderator/meta/meine-berechtigungen`."""

import pytest

from app.core.security import hash_secret
from app.models.moderator import Moderator
from app.services import berechtigungs_service, modul_service


async def _moderator(db, username, rolle, passwort="geheim123"):
    mod = Moderator(username=username, passwort_hash=hash_secret(passwort), rolle=rolle)
    db.add(mod)
    await db.commit()
    await db.refresh(mod)
    return mod


@pytest.mark.asyncio
async def test_meine_keys_admin_hat_alle(db):
    await modul_service.ensure_module(db)
    admin = await _moderator(db, "admin", "admin")
    keys = set(await berechtigungs_service.meine_keys(db, admin))
    registry = {d.key for d in modul_service.MODUL_REGISTRY}
    assert registry <= keys


@pytest.mark.asyncio
async def test_meine_keys_gruppenfuehrer_nur_freigegebene(db):
    await modul_service.ensure_module(db)
    gf = await _moderator(db, "gf", "gruppenfuehrer")
    assert await berechtigungs_service.meine_keys(db, gf) == []
    await berechtigungs_service.set_berechtigung(db, gf.id, "einstellungen", True)
    assert await berechtigungs_service.meine_keys(db, gf) == ["einstellungen"]


@pytest.mark.asyncio
async def test_endpunkt_gruppenfuehrer(client, db):
    await modul_service.ensure_module(db)
    gf = await _moderator(db, "gf", "gruppenfuehrer")
    await berechtigungs_service.set_berechtigung(db, gf.id, "berechtigungen", True)
    login = await client.post(
        "/api/v1/auth/moderator/login", data={"username": "gf", "password": "geheim123"}
    )
    token = login.json()["access_token"]
    r = await client.get(
        "/api/v1/moderator/meta/meine-berechtigungen",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["ist_admin"] is False
    assert body["keys"] == ["berechtigungen"]


@pytest.mark.asyncio
async def test_endpunkt_admin(client, db):
    await modul_service.ensure_module(db)
    await _moderator(db, "admin", "admin")
    login = await client.post(
        "/api/v1/auth/moderator/login", data={"username": "admin", "password": "geheim123"}
    )
    token = login.json()["access_token"]
    r = await client.get(
        "/api/v1/moderator/meta/meine-berechtigungen",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert r.json()["ist_admin"] is True
    assert "einstellungen" in r.json()["keys"]


@pytest.mark.asyncio
async def test_endpunkt_ohne_login_401(client, db):
    r = await client.get("/api/v1/moderator/meta/meine-berechtigungen")
    assert r.status_code == 401
