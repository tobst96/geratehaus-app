from datetime import datetime, timezone
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.einsatz import Einsatz
from app.services import divera_client, einsatz_service, notifier_service
from app.services.config_service import config_service

logger = structlog.get_logger(__name__)


def _alarm_normalisieren(roh: dict[str, Any]) -> dict[str, Any] | None:
    """Bildet unterschiedliche Divera-Antwortformen auf ein einheitliches
    {divera_id, titel, zeitpunkt} ab. Bei abweichenden Feldnamen (je nach
    Divera-Tarif) genügt eine Anpassung hier."""
    divera_id = roh.get("id") or roh.get("alarm_id")
    titel = roh.get("title") or roh.get("text") or roh.get("name")
    zeit_roh = roh.get("date") or roh.get("start_time") or roh.get("created")
    if divera_id is None or not titel:
        return None

    if isinstance(zeit_roh, (int, float)):
        zeitpunkt = datetime.fromtimestamp(zeit_roh, tz=timezone.utc)
    elif isinstance(zeit_roh, str):
        try:
            zeitpunkt = datetime.fromisoformat(zeit_roh)
        except ValueError:
            zeitpunkt = datetime.now(timezone.utc)
    else:
        zeitpunkt = datetime.now(timezone.utc)

    return {"divera_id": str(divera_id), "titel": str(titel), "zeitpunkt": zeitpunkt}


async def importiere_alarm(db: AsyncSession, roh: dict[str, Any]) -> Einsatz | None:
    """Legt einen Einsatz aus einem Divera-Alarm an, falls er noch nicht
    existiert (Upsert über divera_id). Bestehende Einsätze werden nicht
    überschrieben, um manuelle Nachbearbeitung nicht zu verlieren."""
    alarm = _alarm_normalisieren(roh)
    if alarm is None:
        logger.warning("divera_alarm_unvollstaendig", roh=roh)
        return None

    result = await db.execute(select(Einsatz).where(Einsatz.divera_id == alarm["divera_id"]))
    if result.scalar_one_or_none() is not None:
        return None

    einsatz = Einsatz(
        titel=alarm["titel"],
        quelle="divera",
        divera_id=alarm["divera_id"],
        zeitpunkt=alarm["zeitpunkt"],
    )
    db.add(einsatz)
    await db.commit()
    await einsatz_service.ereignis_protokollieren(
        db, einsatz.id, "angelegt", "Einsatz angelegt (divera)"
    )
    logger.info("divera_einsatz_importiert", divera_id=alarm["divera_id"], titel=alarm["titel"])
    await notifier_service.benachrichtige(db, "benachrichtigung_divera_alarm", titel=alarm["titel"])
    return await einsatz_service.get_einsatz(db, einsatz.id)


async def synchronisiere(db: AsyncSession) -> int:
    """Pollt die Divera-API und importiert neue Alarme. Gibt die Anzahl der
    neu angelegten Einsätze zurück."""
    divera_aktiv = await config_service.get(db, "divera_aktiv", False)
    api_key = await config_service.get(db, "divera_api_key", "")
    if not divera_aktiv or not api_key:
        return 0
    last_ts = await config_service.get(db, "divera_last_ts", 0) or None
    if last_ts == 0:
        last_ts = None
    alarme, neuer_ts = await divera_client.hole_alarme(api_key, last_ts=last_ts)
    anzahl_neu = 0
    for roh in alarme:
        einsatz = await importiere_alarm(db, roh)
        if einsatz is not None:
            anzahl_neu += 1
    await config_service.set(db, "divera_letzter_sync", datetime.now(timezone.utc).isoformat())
    await config_service.set(db, "divera_letzter_sync_anzahl", len(alarme))
    if neuer_ts is not None:
        await config_service.set(db, "divera_last_ts", neuer_ts)
    logger.info("divera_synchronisation_abgeschlossen", anzahl_neu=anzahl_neu, anzahl_gesamt=len(alarme), last_ts=last_ts, neuer_ts=neuer_ts)
    return anzahl_neu
