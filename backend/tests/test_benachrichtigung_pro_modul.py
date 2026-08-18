"""Ereignis-Abos pro Modul: die Personal-Abo-UI (`/gruppenfuehrer/ereignis-typen`)
bietet modulgebundene Ereignisse nur für *aktivierte* Module an; modulunabhängige
Verwaltungs-Ereignisse immer. Jedes Ereignis trägt seine Modul-Zuordnung."""

import pytest

from app.core.security import hash_secret
from app.models.person import Person
from app.services import modul_service
from app.services.config_service import config_service


async def _admin(client, db):
    db.add(Person(name="admin", email="admin", passwort_hash=hash_secret("geheim123"), gruppenfuehrer_rolle="admin"))
    await db.commit()
    r = await client.post(
        "/api/v1/auth/gruppenfuehrer/login", data={"username": "admin", "password": "geheim123"}
    )
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.mark.asyncio
async def test_nur_aktive_module_angeboten(client, db):
    await modul_service.ensure_module(db)
    h = await _admin(client, db)

    await config_service.set(db, "modul_dienstbuch_aktiv", True)
    await config_service.set(db, "modul_dienststunden_aktiv", False)

    r = await client.get("/api/v1/gruppenfuehrer/ereignis-typen", headers=h)
    assert r.status_code == 200
    keys = {e["key"] for e in r.json()}

    # Dienstbuch aktiv → sein Ereignis wird angeboten.
    assert "benachrichtigung_neues_dienstbuch" in keys
    # Dienststunden inaktiv → sein Ereignis fehlt.
    assert "benachrichtigung_schwellenwert_ueberschreitung" not in keys
    # Modulunabhängige Verwaltungs-Ereignisse immer vorhanden.
    assert "benachrichtigung_person_inaktiv" in keys


@pytest.mark.asyncio
async def test_modul_zuordnung_im_out(client, db):
    await modul_service.ensure_module(db)
    h = await _admin(client, db)
    await config_service.set(db, "modul_dienstbuch_aktiv", True)

    r = await client.get("/api/v1/gruppenfuehrer/ereignis-typen", headers=h)
    nach_key = {e["key"]: e for e in r.json()}

    db_ereignis = nach_key["benachrichtigung_neues_dienstbuch"]
    assert db_ereignis["modul"] == "dienstbuch"
    assert db_ereignis["modul_label"] == "Dienstbuch"

    allgemein = nach_key["benachrichtigung_person_inaktiv"]
    assert allgemein["modul"] is None
    assert allgemein["modul_label"] == "Allgemein"
