"""Zentraler APScheduler-Prozess für periodische Hintergrund-Jobs
(Divera-Polling, Archivierung). Wird im FastAPI-Lifespan gestartet/gestoppt."""

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.services import archive_service, divera_service

logger = structlog.get_logger(__name__)

scheduler = AsyncIOScheduler()


async def _divera_polling_job() -> None:
    async with AsyncSessionLocal() as db:
        try:
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
    if settings.divera_enabled and settings.divera_mode == "polling":
        scheduler.add_job(
            _divera_polling_job,
            "interval",
            seconds=settings.divera_poll_interval_seconds,
            id="divera_polling",
            replace_existing=True,
        )
        logger.info("divera_polling_job_registriert", intervall=settings.divera_poll_interval_seconds)

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
