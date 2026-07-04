"""Zentraler APScheduler-Prozess für periodische Hintergrund-Jobs
(Divera-Polling, Archivierung). Wird im FastAPI-Lifespan gestartet/gestoppt."""

import random
from datetime import datetime, timezone

import structlog
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import func, select

from app.core import zeit
from app.db.session import AsyncSessionLocal
from app.models.backup import Backup
from app.services import (
    ampel_service,
    archive_service,
    backup_service,
    barcode_service,
    dienstbuch_service,
    divera_personal_service,
    divera_service,
    einsatz_service,
    formular_service,
    pin_service,
    stammdaten_service,
)
from app.services.config_service import config_service

logger = structlog.get_logger(__name__)

DIVERA_POLL_INTERVALL_SEKUNDEN = 300

# Cron-Jobs (Archivierung, Barcode-Erneuerung, PIN-Erinnerung usw.) sollen zur
# lokalen Uhrzeit feuern, unabhängig von der Container-Zeit (i. d. R. UTC).
scheduler = AsyncIOScheduler(timezone=ZoneInfo(zeit.STANDARD_ZEITZONE))

# Einmal pro Prozessstart zufällig gewählte Uhrzeit (Nachtstunden) für den
# täglichen Divera-Personal-Sync – "zufällig einmal am Tag" statt einer für
# alle Instanzen identischen festen Uhrzeit, ohne ständig wechselnde
# Cron-Ausdrücke verwalten zu müssen.
_DIVERA_PERSONAL_SYNC_STUNDE = random.randint(2, 5)
_DIVERA_PERSONAL_SYNC_MINUTE = random.randint(0, 59)


async def _divera_polling_job() -> None:
    async with AsyncSessionLocal() as db:
        try:
            divera_modus = await config_service.get(db, "divera_modus", "polling")
            if divera_modus != "polling":
                return
            await divera_service.synchronisiere(db)
        except Exception:
            logger.warning("divera_polling_fehlgeschlagen", exc_info=True)


async def _divera_personal_sync_job() -> None:
    """Läuft täglich zu einer beim Prozessstart zufällig gewählten Uhrzeit;
    holt Divera-Personal-Vorschläge (neue Personen, E-Mail-Abweichungen) und
    räumt Vorschläge auf, die älter als 1 Jahr sind."""
    async with AsyncSessionLocal() as db:
        try:
            divera_aktiv = await config_service.get(db, "divera_aktiv", False)
            if not divera_aktiv:
                return
            anzahl_neu = await divera_personal_service.synchronisiere_personal(db)
            anzahl_aufgeraeumt = await divera_personal_service.raeume_alte_vorschlaege_auf(db)
            if anzahl_neu or anzahl_aufgeraeumt:
                logger.info(
                    "divera_personal_sync_job_abgeschlossen",
                    anzahl_neu=anzahl_neu,
                    anzahl_aufgeraeumt=anzahl_aufgeraeumt,
                )
        except Exception:
            logger.warning("divera_personal_sync_fehlgeschlagen", exc_info=True)


async def _archivierung_job() -> None:
    async with AsyncSessionLocal() as db:
        try:
            await archive_service.archiviere_alte_eintraege(db)
        except Exception:
            logger.warning("archivierung_fehlgeschlagen", exc_info=True)


async def _einsatz_autoabschluss_job() -> None:
    """Läuft stündlich; schließt offene, inaktive Einsätze aber nur in der
    in den Einstellungen konfigurierten Stunde – so wirkt eine Änderung der
    Uhrzeit sofort, ohne den Scheduler-Job neu registrieren zu müssen."""
    async with AsyncSessionLocal() as db:
        try:
            stunde = await config_service.get(db, "einsatz_autoabschluss_stunde", 4)
            if await zeit.lokale_stunde(db) != int(stunde):
                return
            inaktivitaet_stunden = await config_service.get(
                db, "einsatz_autoabschluss_inaktivitaet_stunden", 4
            )
            einsaetze = await einsatz_service.offene_einsaetze_inaktiv_seit(db, int(inaktivitaet_stunden))
            for einsatz in einsaetze:
                await einsatz_service.einsatz_abschliessen(db, einsatz)
            if einsaetze:
                logger.info("einsaetze_automatisch_abgeschlossen", anzahl=len(einsaetze))
        except Exception:
            logger.warning("einsatz_autoabschluss_fehlgeschlagen", exc_info=True)


async def _einsatz_geplanter_abschluss_job() -> None:
    """Läuft minütlich; schließt Einsätze, deren über 'Alle eingetragen'
    geplanter Abschlusszeitpunkt erreicht ist."""
    async with AsyncSessionLocal() as db:
        try:
            einsaetze = await einsatz_service.einsaetze_mit_faelligem_abschluss(db)
            for einsatz in einsaetze:
                await einsatz_service.einsatz_abschliessen(db, einsatz)
        except Exception:
            logger.warning("einsatz_geplanter_abschluss_fehlgeschlagen", exc_info=True)


async def _personen_inaktivitaet_job() -> None:
    """Läuft täglich um 0 Uhr; warnt inaktive Personen einmalig 7 Tage vor
    Ablauf und löscht Personen, die die eingestellte Inaktivitätsschwelle
    erreicht haben (inkl. aller zugehörigen Daten)."""
    async with AsyncSessionLocal() as db:
        try:
            warnungen, loeschungen = await stammdaten_service.personen_inaktivitaet_pruefen(db)
            if warnungen or loeschungen:
                logger.info(
                    "personen_inaktivitaet_geprueft", warnungen=warnungen, loeschungen=loeschungen
                )
        except Exception:
            logger.warning("personen_inaktivitaet_fehlgeschlagen", exc_info=True)


async def _barcode_erneuerung_job() -> None:
    """Läuft täglich um 3:30 Uhr; erneuert abgelaufene Barcodes und versendet
    die neuen per E-Mail an Personen mit aktivierten Benachrichtigungen."""
    async with AsyncSessionLocal() as db:
        try:
            paare = await barcode_service.abgelaufene_personen_fuer_erneuerung(db)
            gesendet = 0
            for _token, person in paare:
                try:
                    await barcode_service.erneuerung_mail_senden(db, person)
                    gesendet += 1
                except Exception:
                    logger.warning("barcode_erneuerungsmail_fehlgeschlagen", person_id=person.id, exc_info=True)
            if gesendet:
                logger.info("barcodes_erneuert", anzahl=gesendet)
        except Exception:
            logger.warning("barcode_erneuerung_job_fehlgeschlagen", exc_info=True)


async def _dienstbuch_autoschluss_job() -> None:
    """Läuft stündlich; schließt alle noch offenen Dienstbücher in der in
    den Einstellungen konfigurierten Stunde (Standard 4 Uhr)."""
    async with AsyncSessionLocal() as db:
        try:
            stunde = await config_service.get(db, "dienstbuch_autoschluss_stunde", 4)
            if await zeit.lokale_stunde(db) != int(stunde):
                return
            dienstbuecher = await dienstbuch_service.offene_dienstbuecher(db)
            for dienstbuch in dienstbuecher:
                await dienstbuch_service.dienstbuch_schliessen(db, dienstbuch)
            if dienstbuecher:
                logger.info("dienstbuecher_automatisch_geschlossen", anzahl=len(dienstbuecher))
        except Exception:
            logger.warning("dienstbuch_autoschluss_fehlgeschlagen", exc_info=True)


async def _pin_erinnerung_job() -> None:
    """Läuft täglich um 8:00 Uhr; erinnert Personen ohne gesetzten PIN (mit
    E-Mail) alle X Tage per Self-Service-Mail. Nur aktiv, wenn das Barcode-Modul
    AUS ist (steuert der Job selbst über pin_service)."""
    async with AsyncSessionLocal() as db:
        try:
            versendet = await pin_service.erinnerungen_versenden(db)
            if versendet:
                logger.info("pin_erinnerungen_versendet", anzahl=versendet)
        except Exception:
            logger.warning("pin_erinnerung_fehlgeschlagen", exc_info=True)


async def _personal_ampel_job() -> None:
    """Läuft täglich um 7:15 Uhr; meldet Personen, die neu die gelbe bzw. rote
    Aktivitäts-Ampel überschritten haben (einmalig je Schwelle)."""
    async with AsyncSessionLocal() as db:
        try:
            gesendet = await ampel_service.ampel_benachrichtigungen_versenden(db)
            if gesendet:
                logger.info("personal_ampel_benachrichtigungen", anzahl=gesendet)
        except Exception:
            logger.warning("personal_ampel_job_fehlgeschlagen", exc_info=True)


async def _formular_ablauf_job() -> None:
    """Läuft alle 15 min; schickt für gerade abgelaufene Formulare einmalig eine
    Auswertung per Mail an den hinterlegten Empfänger."""
    async with AsyncSessionLocal() as db:
        try:
            gesendet = await formular_service.ablauf_zusammenfassungen_versenden(db)
            if gesendet:
                logger.info("formular_ablauf_auswertungen_versendet", anzahl=gesendet)
        except Exception:
            logger.warning("formular_ablauf_job_fehlgeschlagen", exc_info=True)


async def _backup_job() -> None:
    """Läuft alle 15 min; erstellt höchstens EIN Backup pro Tag zur konfigurierten
    Uhrzeit an den gewählten Wochentagen (mit Nachhol-Logik nach Ausfall)."""
    async with AsyncSessionLocal() as db:
        try:
            wochentage = {
                int(x)
                for x in str(await config_service.get(db, "backup_wochentage", "")).split(",")
                if x.strip().isdigit()
            }
            if not wochentage:
                return
            jetzt = await zeit.jetzt_lokal(db)
            if jetzt.weekday() not in wochentage:
                return
            stunde = int(await config_service.get(db, "backup_zeit_stunde", 3))
            minute = int(await config_service.get(db, "backup_zeit_minute", 0))
            if (jetzt.hour, jetzt.minute) < (stunde, minute):
                return
            tages_start_utc = jetzt.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
            bereits = (
                await db.execute(
                    select(func.count())
                    .select_from(Backup)
                    .where(Backup.status == "ok", Backup.erstellt_am >= tages_start_utc)
                )
            ).scalar() or 0
            if bereits:
                return
            await backup_service.erstelle_backup(db, ausloeser="geplant")
        except Exception:
            logger.warning("backup_job_fehlgeschlagen", exc_info=True)


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

    # Stündlich registriert; die konfigurierte Stunde wird im Job selbst
    # geprüft, damit eine Änderung in den Einstellungen sofort wirkt.
    scheduler.add_job(
        _einsatz_autoabschluss_job,
        "cron",
        minute=0,
        id="einsatz_autoabschluss",
        replace_existing=True,
    )
    logger.info("einsatz_autoabschluss_job_registriert")

    scheduler.add_job(
        _einsatz_geplanter_abschluss_job,
        "interval",
        minutes=1,
        id="einsatz_geplanter_abschluss",
        replace_existing=True,
    )
    logger.info("einsatz_geplanter_abschluss_job_registriert")

    scheduler.add_job(
        _dienstbuch_autoschluss_job,
        "cron",
        minute=0,
        id="dienstbuch_autoschluss",
        replace_existing=True,
    )
    logger.info("dienstbuch_autoschluss_job_registriert")

    scheduler.add_job(
        _personen_inaktivitaet_job,
        "cron",
        hour=0,
        minute=0,
        id="personen_inaktivitaet",
        replace_existing=True,
    )
    logger.info("personen_inaktivitaet_job_registriert", uhrzeit="00:00")

    scheduler.add_job(
        _barcode_erneuerung_job,
        "cron",
        hour=3,
        minute=30,
        id="barcode_erneuerung",
        replace_existing=True,
    )
    logger.info("barcode_erneuerung_job_registriert", uhrzeit="03:30")

    scheduler.add_job(
        _divera_personal_sync_job,
        "cron",
        hour=_DIVERA_PERSONAL_SYNC_STUNDE,
        minute=_DIVERA_PERSONAL_SYNC_MINUTE,
        id="divera_personal_sync",
        replace_existing=True,
    )
    logger.info(
        "divera_personal_sync_job_registriert",
        uhrzeit=f"{_DIVERA_PERSONAL_SYNC_STUNDE:02d}:{_DIVERA_PERSONAL_SYNC_MINUTE:02d}",
    )

    scheduler.add_job(
        _pin_erinnerung_job,
        "cron",
        hour=8,
        minute=0,
        id="pin_erinnerung",
        replace_existing=True,
    )
    logger.info("pin_erinnerung_job_registriert", uhrzeit="08:00")

    scheduler.add_job(
        _personal_ampel_job,
        "cron",
        hour=7,
        minute=15,
        id="personal_ampel",
        replace_existing=True,
    )
    logger.info("personal_ampel_job_registriert", uhrzeit="07:15")

    # Alle 15 min prüfen, ob Formulare abgelaufen sind (zeitnahe Auswertungs-Mail).
    scheduler.add_job(
        _formular_ablauf_job,
        "interval",
        minutes=15,
        id="formular_ablauf",
        replace_existing=True,
    )
    logger.info("formular_ablauf_job_registriert")

    # Alle 15 min; ob/ wann tatsächlich gesichert wird, entscheidet der Job anhand
    # der konfigurierten Uhrzeit/Wochentage (einmal pro Tag, mit Nachhol-Logik).
    scheduler.add_job(
        _backup_job,
        "interval",
        minutes=15,
        id="backup",
        replace_existing=True,
    )
    logger.info("backup_job_registriert")


def start() -> None:
    registriere_jobs()
    if scheduler.get_jobs():
        scheduler.start()


def shutdown() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
