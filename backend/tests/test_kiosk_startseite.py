"""Tests für die pro-Kiosk konfigurierbaren Startseiten-Module."""

import pytest

from app.services import kiosk_token_service
from app.services.config_service import config_service


async def _kiosk(db):
    return await kiosk_token_service.anlegen(db, "Tablet Test")


@pytest.mark.asyncio
async def test_startseite_module_global_fallback(db):
    """Ohne pro-Kiosk-Auswahl (None) gilt die globale modul_<key>_startseite."""
    kiosk = await _kiosk(db)
    await config_service.set(db, "modul_einsatztagebuch_aktiv", True)
    await config_service.set(db, "modul_einsatztagebuch_startseite", True)
    await config_service.set(db, "modul_dienstbuch_aktiv", True)
    await config_service.set(db, "modul_dienstbuch_startseite", False)

    keys = await kiosk_token_service.effektive_startseite_module(db, kiosk)
    assert "einsatztagebuch" in keys
    assert "dienstbuch" not in keys


@pytest.mark.asyncio
async def test_startseite_module_pro_kiosk(db):
    """Eine gesetzte Liste überschreibt die globale Einstellung – aber nur aktive
    Module erscheinen."""
    kiosk = await _kiosk(db)
    await config_service.set(db, "modul_einsatztagebuch_startseite", True)
    await config_service.set(db, "modul_dienstbuch_aktiv", True)

    await kiosk_token_service.set_startseite_module(db, kiosk, ["dienstbuch"])
    keys = await kiosk_token_service.effektive_startseite_module(db, kiosk)
    assert keys == ["dienstbuch"]  # trotz global aktivem Einsatztagebuch

    # Inaktives Modul wird auch bei Auswahl nicht angezeigt.
    await config_service.set(db, "modul_dienstbuch_aktiv", False)
    keys = await kiosk_token_service.effektive_startseite_module(db, kiosk)
    assert keys == []


@pytest.mark.asyncio
async def test_kiosk_validieren_liefert_module(client, db):
    kiosk = await _kiosk(db)
    await config_service.set(db, "modul_einsatztagebuch_aktiv", True)
    await config_service.set(db, "modul_einsatztagebuch_startseite", True)

    r = await client.get(f"/api/v1/kiosk-tokens/{kiosk.token}/validieren")
    assert r.status_code == 200
    body = r.json()
    assert body["gueltig"] is True
    assert "einsatztagebuch" in body["startseite_module"]
