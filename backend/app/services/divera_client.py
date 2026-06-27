"""Schlanker HTTP-Client für die Divera 24/7-API.

Hinweis: Das exakte Antwortformat unterscheidet sich je Divera-Tarif/-Version.
Die Feldzuordnung ist in divera_service._alarm_normalisieren() isoliert,
damit sie sich bei Bedarf ohne Eingriff in die Synchronisationslogik anpassen
lässt.
"""

import httpx
import structlog

logger = structlog.get_logger(__name__)

BASIS_URL = "https://app.divera247.com/api/v2"


async def hole_alarme(api_key: str) -> list[dict]:
    """Holt aktuelle/letzte Alarme (Einsätze) für den Polling-Modus."""
    url = f"{BASIS_URL}/pull/all"
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            response = await client.get(url, params={"accesskey": api_key})
            response.raise_for_status()
        except httpx.HTTPError:
            logger.warning("divera_abruf_fehlgeschlagen", exc_info=True)
            return []

    daten = response.json()
    alarme = daten.get("data", {}).get("alarm", {}).get("items", {})
    if isinstance(alarme, dict):
        alarme = list(alarme.values())
    return alarme or []
