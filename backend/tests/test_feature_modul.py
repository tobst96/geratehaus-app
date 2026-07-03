"""Tests für die Feature-Module (An/Aus, Kiosk/Außenzugriff, Sortierung)."""

import pytest

from app.core.security import hash_secret
from app.models.moderator import Moderator
from app.services import feature_modul_service
from app.services.config_service import config_service


async def _admin_token(client, db):
    db.add(Moderator(username="admin", passwort_hash=hash_secret("geheim123"), rolle="admin"))
    await db.commit()
    login = await client.post(
        "/api/v1/auth/moderator/login", data={"username": "admin", "password": "geheim123"}
    )
    return login.json()["access_token"]


_ALLE = ["personal", "fahrzeuge", "einsatztagebuch", "dienstbuch", "dienststunden", "fahrzeugbuchung", "divera"]


@pytest.mark.asyncio
async def test_liste_default_reihenfolge_und_immer_aktiv(db):
    liste = await feature_modul_service.liste(db)
    assert [m["key"] for m in liste] == _ALLE
    divera = next(m for m in liste if m["key"] == "divera")
    assert divera["mitgliederseitig"] is False and divera["immer_aktiv"] is False
    assert divera["startseite"] is None and divera["aussenzugriff"] is None
    et = next(m for m in liste if m["key"] == "einsatztagebuch")
    assert et["mitgliederseitig"] is True
    assert isinstance(et["startseite"], bool)
    # Personal/Fahrzeuge: intern, immer aktiv
    for key in ("personal", "fahrzeuge"):
        m = next(x for x in liste if x["key"] == key)
        assert m["immer_aktiv"] is True and m["aktiv"] is True and m["mitgliederseitig"] is False


@pytest.mark.asyncio
async def test_set_flag_und_schalter_regeln(db):
    assert await feature_modul_service.set_flag(db, "dienstbuch", "aktiv", False) is True
    assert (await feature_modul_service.eintrag(db, "dienstbuch"))["aktiv"] is False
    assert await feature_modul_service.set_flag(db, "einsatztagebuch", "startseite", False) is True
    # Divera hat keine Kiosk-/Außenzugriff-Schalter -> abgelehnt
    assert await feature_modul_service.set_flag(db, "divera", "startseite", True) is False
    assert await feature_modul_service.set_flag(db, "divera", "aussenzugriff", True) is False
    assert await feature_modul_service.set_flag(db, "divera", "aktiv", True) is True
    # Immer-aktive Module lassen sich nicht abschalten
    assert await feature_modul_service.set_flag(db, "personal", "aktiv", False) is False
    assert await feature_modul_service.set_flag(db, "fahrzeuge", "aktiv", False) is False
    assert await feature_modul_service.ist_aktiv(db, "personal") is True
    # unbekanntes Modul/Feld
    assert await feature_modul_service.set_flag(db, "gibtsnicht", "aktiv", True) is False
    assert await feature_modul_service.set_flag(db, "dienstbuch", "quatsch", True) is False


@pytest.mark.asyncio
async def test_reihenfolge_setzen_und_validierung(db):
    neu = ["divera", "personal", "fahrzeuge", "einsatztagebuch", "dienstbuch", "dienststunden", "fahrzeugbuchung"]
    assert await feature_modul_service.set_reihenfolge(db, neu) is True
    assert [m["key"] for m in await feature_modul_service.liste(db)] == neu
    # unvollständig / unbekannt -> abgelehnt
    assert await feature_modul_service.set_reihenfolge(db, ["divera"]) is False
    assert await feature_modul_service.set_reihenfolge(db, _ALLE[:-1] + ["fremd"]) is False


@pytest.mark.asyncio
async def test_reihenfolge_robust_gegen_kaputte_config(db):
    await config_service.set(db, "modul_reihenfolge", "dienstbuch, , unbekannt")
    keys = [m["key"] for m in await feature_modul_service.liste(db)]
    # dienstbuch zuerst (aus Config), Rest in Registry-Reihenfolge angehängt, keine Duplikate/Unbekannte
    assert keys[0] == "dienstbuch"
    assert sorted(keys) == sorted(m.key for m in feature_modul_service.FEATURE_MODULE)


async def test_endpoints_auth_und_flow(client, db):
    ohne = await client.get("/api/v1/moderator/feature-module")
    assert ohne.status_code == 401

    token = await _admin_token(client, db)
    h = {"Authorization": f"Bearer {token}"}

    r = await client.get("/api/v1/moderator/feature-module", headers=h)
    assert r.status_code == 200
    assert [m["key"] for m in r.json()][0] == "personal"

    # An/Aus umschalten
    r = await client.patch("/api/v1/moderator/feature-module/dienstbuch", json={"aktiv": False}, headers=h)
    assert r.status_code == 200 and r.json()["aktiv"] is False

    # Divera-Startseite -> 400
    r = await client.patch("/api/v1/moderator/feature-module/divera", json={"startseite": True}, headers=h)
    assert r.status_code == 400

    # Immer-aktives Modul abschalten -> 400
    r = await client.patch("/api/v1/moderator/feature-module/personal", json={"aktiv": False}, headers=h)
    assert r.status_code == 400

    # Reihenfolge setzen
    neu = ["divera", "personal", "fahrzeuge", "einsatztagebuch", "dienstbuch", "dienststunden", "fahrzeugbuchung"]
    r = await client.put("/api/v1/moderator/feature-module/reihenfolge", json={"keys": neu}, headers=h)
    assert r.status_code == 200 and [m["key"] for m in r.json()] == neu

    # ungültige Reihenfolge -> 400
    r = await client.put("/api/v1/moderator/feature-module/reihenfolge", json={"keys": ["divera"]}, headers=h)
    assert r.status_code == 400
