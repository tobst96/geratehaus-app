"""Dienststunden-Funktions-Stempel (Etappe R): öffentliche Info-Seite fürs
QR-Poster + Admin-QR-PDF pro Funktion."""

import pytest

from app.core.security import hash_secret
from app.models.person import Person
from app.schemas.stammdaten import FunktionDienststundenCreate
from app.services import stammdaten_service
from app.services.config_service import config_service


async def _funktion(db, name="Maschinist", aktiv=True):
    return await stammdaten_service.funktion_dienststunden_anlegen(
        db, FunktionDienststundenCreate(name=name, schwellenwert_stunden=0, aktiv=aktiv)
    )


async def _admin_headers(client, db):
    db.add(Person(name="admin", email="admin", passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle="admin"))
    await db.commit()
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "admin", "password": "geheim123"}
    )
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.mark.asyncio
async def test_stempel_info_aktiv(client, db):
    await config_service.set(db, "modul_dienststunden_aktiv", True)
    f = await _funktion(db)
    r = await client.get(f"/api/v1/dienststunden-stempel/{f.id}")
    assert r.status_code == 200
    d = r.json()
    assert d["funktion_name"] == "Maschinist"
    assert d["aktiv"] is True


@pytest.mark.asyncio
async def test_stempel_info_modul_aus_ist_inaktiv(client, db):
    await config_service.set(db, "modul_dienststunden_aktiv", False)
    f = await _funktion(db)
    r = await client.get(f"/api/v1/dienststunden-stempel/{f.id}")
    assert r.status_code == 200
    assert r.json()["aktiv"] is False


@pytest.mark.asyncio
async def test_stempel_info_unbekannt_404(client, db):
    r = await client.get("/api/v1/dienststunden-stempel/99999")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_stempel_pdf_admin(client, db):
    await config_service.set(db, "oeffentliche_basis_url", "https://fw.example.org")
    f = await _funktion(db)
    h = await _admin_headers(client, db)
    r = await client.get(f"/api/v1/gruppenfuehrer/stammdaten/funktionen-dienststunden/{f.id}/pdf", headers=h)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content[:4] == b"%PDF"


@pytest.mark.asyncio
async def test_stempel_pdf_nur_admin(client, db):
    f = await _funktion(db)
    r = await client.get(f"/api/v1/gruppenfuehrer/stammdaten/funktionen-dienststunden/{f.id}/pdf")
    assert r.status_code == 401
