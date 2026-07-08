"""Einsatz-Jahresstatistik: Anzahl im laufenden Jahr (bis Stichtag) inkl.
Vorjahresvergleich zum selben Kalendertag und konfigurierbarem Startwert."""

from datetime import datetime, timezone

import pytest

from app.models.einsatz import Einsatz
from app.models.kiosk_token import KioskToken
from app.services import einsatz_service
from app.services.config_service import config_service


async def _einsatz(db, zeitpunkt: datetime):
    db.add(Einsatz(titel="Test", zeitpunkt=zeitpunkt, quelle="manuell"))
    await db.commit()


async def _kiosk_token(db) -> str:
    db.add(KioskToken(bezeichnung="Testkiosk", token="kiosk-stat-token"))
    await db.commit()
    return "kiosk-stat-token"


@pytest.mark.asyncio
async def test_jahres_und_vorjahresvergleich(db):
    jetzt = datetime.now(timezone.utc)
    jahr = jetzt.year
    # 2 Einsätze dieses Jahr (Anfang Januar, sicher vor heute), 1 im Vorjahr Januar.
    await _einsatz(db, datetime(jahr, 1, 5, 10, 0, tzinfo=timezone.utc))
    await _einsatz(db, datetime(jahr, 1, 6, 10, 0, tzinfo=timezone.utc))
    await _einsatz(db, datetime(jahr - 1, 1, 5, 10, 0, tzinfo=timezone.utc))

    s = await einsatz_service.jahres_statistik(db)
    assert s["jahr"] == jahr
    assert s["anzahl"] == 2
    assert s["vorjahr"] == 1
    assert s["differenz"] == 1


@pytest.mark.asyncio
async def test_startwert_offset_fliesst_ein(db):
    jetzt = datetime.now(timezone.utc)
    jahr = jetzt.year
    await _einsatz(db, datetime(jahr, 1, 5, 10, 0, tzinfo=timezone.utc))
    await config_service.set(db, "einsatz_statistik_offset", 46)
    await config_service.set(db, "einsatz_statistik_offset_jahr", jahr)

    s = await einsatz_service.jahres_statistik(db)
    assert s["anzahl"] == 47  # 1 in der App + 46 Startwert
    # Offset gilt nur fürs laufende Jahr → Vorjahr bleibt unberührt.
    assert s["vorjahr"] == 0


@pytest.mark.asyncio
async def test_offset_anderes_jahr_ignoriert(db):
    jetzt = datetime.now(timezone.utc)
    jahr = jetzt.year
    await config_service.set(db, "einsatz_statistik_offset", 99)
    await config_service.set(db, "einsatz_statistik_offset_jahr", jahr - 5)

    s = await einsatz_service.jahres_statistik(db)
    assert s["anzahl"] == 0  # Offset gilt für ein anderes Jahr


@pytest.mark.asyncio
async def test_statistik_endpunkt(client, db):
    jetzt = datetime.now(timezone.utc)
    await _einsatz(db, datetime(jetzt.year, 1, 5, 10, 0, tzinfo=timezone.utc))
    token = await _kiosk_token(db)
    r = await client.get("/api/v1/einsaetze/statistik", headers={"X-Kiosk-Token": token})
    assert r.status_code == 200
    d = r.json()
    assert d["jahr"] == jetzt.year
    assert d["anzahl"] >= 1
    assert set(d) == {"jahr", "anzahl", "vorjahr", "differenz"}
