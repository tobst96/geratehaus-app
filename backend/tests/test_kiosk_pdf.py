"""Kiosk-Link-QR-PDF: Admin kann pro Kiosk-Gerät ein ausdruckbares PDF mit
QR-Code auf den Kiosk-Link erzeugen (Etappe R)."""

import pytest

from app.core.security import hash_secret
from app.models.person import Person
from app.services import kiosk_token_service
from app.services.config_service import config_service


async def _admin_headers(client, db):
    db.add(Person(name="admin", email="admin", passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle="admin"))
    await db.commit()
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "admin", "password": "geheim123"}
    )
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.mark.asyncio
async def test_kiosk_pdf_wird_erzeugt(client, db):
    await config_service.set(db, "oeffentliche_basis_url", "https://fw.example.org")
    geraet = await kiosk_token_service.anlegen(db, "Tablet Fahrzeughalle")
    h = await _admin_headers(client, db)

    r = await client.get(f"/api/v1/gruppenfuehrer/barcodes/kiosk/{geraet.id}/pdf", headers=h)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content[:4] == b"%PDF"


@pytest.mark.asyncio
async def test_kiosk_pdf_unbekanntes_geraet_404(client, db):
    h = await _admin_headers(client, db)
    r = await client.get("/api/v1/gruppenfuehrer/barcodes/kiosk/99999/pdf", headers=h)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_kiosk_pdf_nur_admin(client, db):
    geraet = await kiosk_token_service.anlegen(db, "Tablet")
    r = await client.get(f"/api/v1/gruppenfuehrer/barcodes/kiosk/{geraet.id}/pdf")
    assert r.status_code == 401
