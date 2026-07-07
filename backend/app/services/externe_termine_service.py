"""Externe (iCal-/webcal-)Kalender für den Fahrzeug-Buchungskalender.

Admin-konfigurierte Kalender-URLs (`fahrzeugbuchung_ical_urls`) werden
serverseitig geladen und geparst; die Termine werden als **nicht buchbare
Fremdtermine** überlagert und in die Konfliktprüfung einbezogen. Fehlerhafte/
nicht erreichbare Feeds werden übersprungen (dürfen die Buchung nie brechen).
Wiederkehrende Termine (RRULE) werden über `recurring_ical_events` im
angefragten Zeitfenster expandiert. Ergebnisse werden kurz gecacht, damit der
Kalender/die Anfrage nicht bei jedem Aufruf externe Server abfragt."""

import time
from datetime import date, datetime, timedelta, timezone

import httpx
import recurring_ical_events
import structlog
from icalendar import Calendar
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.config_service import config_service

logger = structlog.get_logger(__name__)

_CACHE_TTL_SEKUNDEN = 300
_HTTP_TIMEOUT = 10.0
# url -> (abgelaufen_ab, ics_text | None)
_cache: dict[str, tuple[float, str | None]] = {}


async def _konfigurierte_urls(db: AsyncSession) -> list[str]:
    roh = str(await config_service.get(db, "fahrzeugbuchung_ical_urls", "") or "")
    urls: list[str] = []
    for zeile in roh.replace(",", "\n").splitlines():
        u = zeile.strip()
        if u.startswith("webcal://"):
            u = "https://" + u[len("webcal://") :]
        if u.startswith(("http://", "https://")):
            urls.append(u)
    return urls


async def _hole_ics_text(url: str) -> str | None:
    """Lädt den iCal-Text (mit kurzem Cache). Seam für Tests (hier mocken)."""
    jetzt = time.monotonic()
    gecacht = _cache.get(url)
    if gecacht and gecacht[0] > jetzt:
        return gecacht[1]
    text: str | None = None
    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT, follow_redirects=True) as client:
            antwort = await client.get(url)
            antwort.raise_for_status()
            text = antwort.text
    except Exception:
        logger.warning("externer_kalender_abruf_fehlgeschlagen", url=url, exc_info=True)
        text = None
    _cache[url] = (jetzt + _CACHE_TTL_SEKUNDEN, text)
    return text


def _als_utc(wert: datetime | date) -> datetime:
    if isinstance(wert, datetime):
        if wert.tzinfo is None:
            return wert.replace(tzinfo=timezone.utc)
        return wert.astimezone(timezone.utc)
    # Ganztägig (date) → Mitternacht UTC.
    return datetime(wert.year, wert.month, wert.day, tzinfo=timezone.utc)


def _termine_aus_text(text: str, von: datetime, bis: datetime) -> list[dict]:
    kalender = Calendar.from_ical(text)
    ergebnis: list[dict] = []
    for komponente in recurring_ical_events.of(kalender).between(von, bis):
        start_roh = komponente.get("DTSTART")
        if start_roh is None:
            continue
        start = _als_utc(start_roh.dt)
        ende_roh = komponente.get("DTEND")
        ende = _als_utc(ende_roh.dt) if ende_roh is not None else start
        if ende <= start:
            # Ganztägig ohne/mit gleichem DTEND → mindestens den Tag blocken.
            ende = start + timedelta(days=1) if not isinstance(start_roh.dt, datetime) else start + timedelta(hours=1)
        titel = str(komponente.get("SUMMARY") or "Termin")
        ergebnis.append({"titel": titel, "von": start, "bis": ende})
    return ergebnis


async def externe_termine(db: AsyncSession, von: datetime, bis: datetime) -> list[dict]:
    """Fremdtermine aller konfigurierten Kalender im Fenster [von, bis)."""
    ergebnis: list[dict] = []
    for url in await _konfigurierte_urls(db):
        text = await _hole_ics_text(url)
        if not text:
            continue
        try:
            ergebnis.extend(_termine_aus_text(text, von, bis))
        except Exception:
            logger.warning("externer_kalender_parse_fehlgeschlagen", url=url, exc_info=True)
    ergebnis.sort(key=lambda t: t["von"])
    return ergebnis


async def hat_externen_konflikt(db: AsyncSession, von: datetime, bis: datetime) -> bool:
    """True, wenn ein Fremdtermin das Zeitfenster [von, bis) überlappt."""
    for termin in await externe_termine(db, von, bis):
        if termin["von"] < bis and termin["bis"] > von:
            return True
    return False
