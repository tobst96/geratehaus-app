"""Zentraler APScheduler-Prozess für periodische Hintergrund-Jobs
(Divera-Polling, Archivierung). Wird im FastAPI-Lifespan gestartet/gestoppt."""

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.db.session import AsyncSessionLocal
from app.services import archive_service, divera_service
from app.services.config_service import config_service

logger = structlog.get_logger(__name__)

DIVERA_POLL_INTERVALL_SEKUNDEN = 300

scheduler = AsyncIOScheduler()


async def _divera_polling_job() -> None:
    async with AsyncSessionLocal() as db:
        try:
            divera_modus = await config_service.get(db, "divera_modus", "polling")
            if divera_modus != "polling":
                return
            await divera_service.synchronisiere(db)
        except Exception:
            logger.warning("divera_polling_fehlgeschlagen", exc_info=True)


async def _archivierung_job() -> None:
    async with AsyncSessionLocal() as db:
        try:
            await archive_service.archiviere_alte_eintraege(db)
        except Exception:
            logger.warning("archivierung_fehlgeschlagen", exc_info=True)


def registriere_jobs() -> None:
    # Immer registriert; ob tatsächlich synchronisiert wird, entscheidet
    # _divera_polling_job anhand der app_config-Werte (Einstellungen-UI),
    # damit Divera ohne Neustart aktiviert/deaktiviert werden kann.
    scheduler.add_job(
        _divera_polling_job,
        "interval",
        seconds=DIVERA_POLL_INTERVALL_SEKUNDEN,
        id="divera_polling",
        replace_existing=True,
    )
    logger.info("divera_polling_job_registriert", intervall=DIVERA_POLL_INTERVALL_SEKUNDEN)

    scheduler.add_job(
        _archivierung_job,
        "cron",
        hour=3,
        minute=0,
        id="archivierung",
        replace_existing=True,
    )
    logger.info("archivierung_job_registriert", uhrzeit="03:00")


def start() -> None:
    registriere_jobs()
    if scheduler.get_jobs():
        scheduler.start()


def shutdown() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
