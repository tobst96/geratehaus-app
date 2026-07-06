"""Kiosk-Auto-Sperre: der Schwellenwert wird über /oeffentliche-konfiguration
ans Frontend geliefert (Default 0 = aus)."""

import pytest

from app.services.config_service import config_service


@pytest.mark.asyncio
async def test_autolock_default_null(client):
    r = await client.get("/api/v1/oeffentliche-konfiguration")
    assert r.status_code == 200
    assert r.json()["kiosk_autolock_sekunden"] == 0


@pytest.mark.asyncio
async def test_autolock_wert_wird_ausgeliefert(client, db):
    await config_service.set(db, "kiosk_autolock_sekunden", 180)
    r = await client.get("/api/v1/oeffentliche-konfiguration")
    assert r.json()["kiosk_autolock_sekunden"] == 180
