"""Zentrale Zeitzonen-Behandlung. Die DB speichert weiter UTC; für serverseitige
Uhrzeit-Vergleiche (z. B. „schließe um 4 Uhr") und Anzeigen wird in die
konfigurierte Zeitzone (app_config `zeitzone`, Default Europe/Berlin) umgerechnet.
Sommer-/Winterzeit erledigt zoneinfo automatisch."""

from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.config_service import config_service

STANDARD_ZEITZONE = "Europe/Berlin"


async def zeitzone(db: AsyncSession) -> ZoneInfo:
    name = str(await config_service.get(db, "zeitzone", STANDARD_ZEITZONE))
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo(STANDARD_ZEITZONE)


async def jetzt_lokal(db: AsyncSession) -> datetime:
    """Aktueller Zeitpunkt in der konfigurierten Zeitzone."""
    return datetime.now(await zeitzone(db))


async def lokale_stunde(db: AsyncSession) -> int:
    """Aktuelle Stunde (0–23) in der konfigurierten Zeitzone – für die
    Uhrzeit-Vergleiche der Scheduler-Jobs statt der Server-/UTC-Stunde."""
    return (await jetzt_lokal(db)).hour
