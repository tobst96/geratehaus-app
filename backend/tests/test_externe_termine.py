"""Externe iCal-Kalender im Buchungskalender: Parsen konfigurierter Feeds,
Einbezug in die Konfliktprüfung und Auslieferung über den Endpunkt. Der
HTTP-Abruf wird gemockt (kein echter Netzzugriff)."""

from datetime import datetime, timezone

import pytest

from app.models.kiosk_token import KioskToken
from app.services import buchung_service, externe_termine_service
from app.services.config_service import config_service

ICS = """BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//DE
BEGIN:VEVENT
UID:1@test
DTSTART:20260715T100000Z
DTEND:20260715T120000Z
SUMMARY:Feuerwehrfest
END:VEVENT
END:VCALENDAR
"""

VON = datetime(2026, 7, 15, 0, 0, tzinfo=timezone.utc)
BIS = datetime(2026, 7, 16, 0, 0, tzinfo=timezone.utc)


@pytest.fixture(autouse=True)
def _mock_fetch(monkeypatch):
    async def _fake(url: str):
        return ICS

    monkeypatch.setattr(externe_termine_service, "_hole_ics_text", _fake)
    externe_termine_service._cache.clear()


async def _feed_konfigurieren(db):
    await config_service.set(db, "fahrzeugbuchung_ical_urls", "https://example.org/kalender.ics")


@pytest.mark.asyncio
async def test_termine_werden_geparst(db):
    await _feed_konfigurieren(db)
    termine = await externe_termine_service.externe_termine(db, VON, BIS)
    assert len(termine) == 1
    assert termine[0]["titel"] == "Feuerwehrfest"
    assert termine[0]["von"] == datetime(2026, 7, 15, 10, 0, tzinfo=timezone.utc)


@pytest.mark.asyncio
async def test_kein_feed_kein_termin(db):
    # Ohne konfigurierte URL keine Fremdtermine.
    termine = await externe_termine_service.externe_termine(db, VON, BIS)
    assert termine == []


@pytest.mark.asyncio
async def test_externer_konflikt(db):
    await _feed_konfigurieren(db)
    # Überlappt den Fremdtermin (10–12 Uhr).
    assert await externe_termine_service.hat_externen_konflikt(
        db, datetime(2026, 7, 15, 11, 0, tzinfo=timezone.utc), datetime(2026, 7, 15, 13, 0, tzinfo=timezone.utc)
    )
    # Kein Überlapp (nach dem Termin).
    assert not await externe_termine_service.hat_externen_konflikt(
        db, datetime(2026, 7, 15, 14, 0, tzinfo=timezone.utc), datetime(2026, 7, 15, 15, 0, tzinfo=timezone.utc)
    )


@pytest.mark.asyncio
async def test_hat_konflikt_bezieht_externe_ein(db):
    await _feed_konfigurieren(db)
    # Fahrzeug ohne eigene Buchung, aber Fremdtermin überlappt → Konflikt.
    konflikt = await buchung_service.hat_konflikt(
        db, 1, datetime(2026, 7, 15, 11, 0, tzinfo=timezone.utc), datetime(2026, 7, 15, 13, 0, tzinfo=timezone.utc)
    )
    assert konflikt is True


@pytest.mark.asyncio
async def test_endpunkt_liefert_termine(client, db):
    await _feed_konfigurieren(db)
    db.add(KioskToken(bezeichnung="Kiosk", token="kiosk-ical-token"))
    await db.commit()
    r = await client.get(
        "/api/v1/buchungen/externe-termine",
        params={"von": VON.isoformat(), "bis": BIS.isoformat()},
        headers={"X-Kiosk-Token": "kiosk-ical-token"},
    )
    assert r.status_code == 200
    daten = r.json()
    assert len(daten) == 1
    assert daten[0]["titel"] == "Feuerwehrfest"
