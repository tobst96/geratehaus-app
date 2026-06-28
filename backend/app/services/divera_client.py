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
    daten_block = daten.get("data", {})
    alarm_block = daten_block.get("alarm", {})
    alarme = alarm_block.get("items", {})
    if isinstance(alarme, dict):
        alarme = list(alarme.values())
    alarme = alarme or []
    if "alarm" not in daten_block:
        logger.warning(
            "divera_unerwartete_antwortstruktur",
            data_keys=list(daten_block.keys()),
        )
    else:
        logger.debug("divera_alarme_geladen", anzahl=len(alarme))
    return alarme


async def hole_personal(api_key: str) -> list[dict]:
    """Holt die Personalliste aller Cluster-Mitglieder für den Personal-Abgleich.
    Nutzt data.cluster.consumer aus /pull/all – das ist ein Dict user_id → user_object,
    im Gegensatz zu data.user (nur das Profil des API-Key-Inhabers).
    Das exakte Feld-Layout variiert je Divera-Tarif – Normalisierung in
    divera_personal_service._person_normalisieren()."""
    url = f"{BASIS_URL}/pull/all"
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            response = await client.get(url, params={"accesskey": api_key})
            response.raise_for_status()
        except httpx.HTTPError:
            logger.warning("divera_personal_abruf_fehlgeschlagen", exc_info=True)
            return []

    daten = response.json()
    cluster = daten.get("data", {}).get("cluster", {})
    consumer = cluster.get("consumer", {}) if isinstance(cluster, dict) else {}
    if isinstance(consumer, dict):
        personal = list(consumer.values())
    elif isinstance(consumer, list):
        personal = consumer
    else:
        personal = []

    if not personal:
        logger.warning(
            "divera_personal_leer",
            cluster_keys=list(cluster.keys()) if isinstance(cluster, dict) else type(cluster).__name__,
        )
    return personal
