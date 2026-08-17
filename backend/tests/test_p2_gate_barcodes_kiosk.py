"""Etappe P2: Barcodes- und Kiosk-Geräte-Router granular über require_modul_zugriff
gesichert. Admins via Bypass (non-breaking), Gruppenführer nur mit erteiltem Recht."""

import pytest

from app.core.security import hash_secret
from app.models.person import Person
from app.services import berechtigungs_service, modul_service


async def _token(client, db, username="admin", rolle="admin"):
    m = Person(name=username, passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle=rolle)
    db.add(m)
    await db.commit()
    await db.refresh(m)
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": username, "password": "geheim123"}
    )
    return m, {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.mark.asyncio
async def test_kiosk_admin_bypass(client, db):
    await modul_service.ensure_module(db)
    _m, h = await _token(client, db)
    r = await client.get("/api/v1/gruppenfuehrer/barcodes/kiosk", headers=h)
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_kiosk_gruppenfuehrer_ohne_recht_403(client, db):
    await modul_service.ensure_module(db)
    _m, h = await _token(client, db, "gf", "gruppenfuehrer")
    r = await client.get("/api/v1/gruppenfuehrer/barcodes/kiosk", headers=h)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_kiosk_gruppenfuehrer_mit_recht_ok(client, db):
    await modul_service.ensure_module(db)
    gf, h = await _token(client, db, "gf", "gruppenfuehrer")
    await berechtigungs_service.set_berechtigung(db, gf.id, "kiosk-geraete", True)
    r = await client.get("/api/v1/gruppenfuehrer/barcodes/kiosk", headers=h)
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_barcodes_gruppenfuehrer_ohne_recht_403(client, db):
    await modul_service.ensure_module(db)
    _m, h = await _token(client, db, "gf", "gruppenfuehrer")
    r = await client.post("/api/v1/gruppenfuehrer/barcodes/person/1", headers=h)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_barcodes_getrennte_rechte(client, db):
    # Recht "kiosk-geraete" gibt KEINEN Zugriff auf die Barcode-Endpunkte.
    await modul_service.ensure_module(db)
    gf, h = await _token(client, db, "gf", "gruppenfuehrer")
    await berechtigungs_service.set_berechtigung(db, gf.id, "kiosk-geraete", True)
    r = await client.post("/api/v1/gruppenfuehrer/barcodes/alle-erneuern-und-senden", headers=h)
    assert r.status_code == 403
