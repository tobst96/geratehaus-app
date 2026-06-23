"""Archivierung alter Einträge. Läuft täglich über den Scheduler.

Archiviert werden Einsätze und Dienstbücher, die älter als der konfigurierte
Archivierungszeitraum (Default 2 Jahre) sind – sie bleiben in der Datenbank
erhalten, verschwinden aber aus den Kameraden-Ansichten und sind nur noch
über die Moderator-Listen (mit archiviert=true) einsehbar.
"""

from datetime import datetime, timezone

import structlog
from dateutil.relativedelta import relativedelta
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dienstbuch import Dienstbuch
from app.models.einsatz import Einsatz
from app.services.config_service import config_service

logger = structlog.get_logger(__name__)


async def archiviere_alte_eintraege(db: AsyncSession) -> dict[str, int]:
    jahre = await config_service.get(db, "archivierungszeitraum_jahre", 2)
    grenze = datetime.now(timezone.utc) - relativedelta(years=jahre)

    einsatz_ergebnis = await db.execute(
        update(Einsatz)
        .where(Einsatz.archiviert.is_(False), Einsatz.zeitpunkt < grenze)
        .values(archiviert=True)
    )
    dienstbuch_ergebnis = await db.execute(
        update(Dienstbuch)
        .where(Dienstbuch.archiviert.is_(False), Dienstbuch.eroeffnet_am < grenze)
        .values(archiviert=True)
    )
    await db.commit()

    anzahl = {
        "einsaetze": einsatz_ergebnis.rowcount or 0,
        "dienstbuecher": dienstbuch_ergebnis.rowcount or 0,
    }
    logger.info("archivierung_durchgefuehrt", grenze=grenze.isoformat(), **anzahl)
    return anzahl
