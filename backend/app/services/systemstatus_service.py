"""System-Status fürs Admin-Observability-Panel: Konnektivität/Konfiguration
von Datenbank, SMTP, MinIO und Divera sowie eine Übersicht der geplanten
Hintergrund-Jobs (nächster Lauf). Bewusst read-only – keine Businesslogik,
nur Statusabfragen fürs Self-Hosting-Support."""

from typing import Any

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services import minio_service, update_service
from app.services.config_service import config_service

logger = structlog.get_logger(__name__)


async def datenbank_ok(db: AsyncSession) -> bool:
    """Einfacher Konnektivitäts-Check (SELECT 1)."""
    try:
        await db.execute(text("SELECT 1"))
        return True
    except Exception:
        logger.warning("systemstatus_db_check_fehlgeschlagen", exc_info=True)
        return False


async def _minio_status(db: AsyncSession) -> dict[str, Any]:
    aktiv = await minio_service.aktiv(db)
    erreichbar: bool | None = None
    if aktiv:
        try:
            await minio_service.liste_buckets(db)
            erreichbar = True
        except Exception:
            logger.warning("systemstatus_minio_check_fehlgeschlagen", exc_info=True)
            erreichbar = False
    return {"aktiv": aktiv, "erreichbar": erreichbar}


async def _scheduler_status() -> dict[str, Any]:
    # Lokaler Import vermeidet Import-Zyklus (jobs importiert Services).
    from app.jobs.scheduler import scheduler

    jobs = [
        {
            "id": job.id,
            "naechster_lauf": job.next_run_time.isoformat() if job.next_run_time else None,
        }
        for job in scheduler.get_jobs()
    ]
    jobs.sort(key=lambda j: j["id"])
    return {"laeuft": scheduler.running, "jobs": jobs}


async def system_status(db: AsyncSession) -> dict[str, Any]:
    smtp_host = str(await config_service.get(db, "notifier_email_smtp_host", "") or "")
    return {
        "version": update_service.installierte_version(),
        "datenbank": {"ok": await datenbank_ok(db)},
        "smtp": {
            "aktiv": bool(await config_service.get(db, "notifier_email_aktiv", False)),
            "konfiguriert": bool(smtp_host),
            "host": smtp_host,
        },
        "minio": await _minio_status(db),
        "divera": {
            "modul_aktiv": bool(await config_service.get(db, "modul_divera_aktiv", False)),
            "api_key_gesetzt": bool(await config_service.get(db, "divera_api_key", "")),
        },
        "scheduler": await _scheduler_status(),
    }
