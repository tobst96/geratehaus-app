"""Etappe M: zentrale Zeitzonen-Umrechnung (Default Europe/Berlin, konfigurierbar)."""

from datetime import datetime, timezone

import pytest

from app.core import zeit
from app.services.config_service import config_service


@pytest.mark.asyncio
async def test_default_europe_berlin(db):
    tz = await zeit.zeitzone(db)
    assert str(tz) == "Europe/Berlin"
    jetzt = await zeit.jetzt_lokal(db)
    assert jetzt.tzinfo is not None
    assert str(jetzt.tzinfo) == "Europe/Berlin"


@pytest.mark.asyncio
async def test_konfigurierbare_zeitzone(db):
    await config_service.set(db, "zeitzone", "UTC")
    jetzt = await zeit.jetzt_lokal(db)
    stunde = await zeit.lokale_stunde(db)
    # In UTC muss die lokale Stunde der UTC-Stunde entsprechen.
    assert stunde == datetime.now(timezone.utc).hour
    assert str(jetzt.tzinfo) == "UTC"


@pytest.mark.asyncio
async def test_ungueltige_zeitzone_faellt_auf_default(db):
    await config_service.set(db, "zeitzone", "Nicht/Existiert")
    tz = await zeit.zeitzone(db)
    assert str(tz) == "Europe/Berlin"
