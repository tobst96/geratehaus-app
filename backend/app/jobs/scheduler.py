"""Zentraler APScheduler-Prozess für periodische Hintergrund-Jobs
(Divera-Polling, Archivierung). Wird im FastAPI-Lifespan gestartet/gestoppt."""

import functools
import random
from datetime import datetime, time, timezone

import sentry_sdk
import structlog
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import func, select

from app.core import zeit
from app.db.session import AsyncSessionLocal
from app.models.backup import Backup
from app.models.dienstbuch_planer import DienstbuchPlanTermin, DienstbuchPlanTerminEreignis
from app.schemas.dienstbuch import DienstbuchAnlegen
from app.services import (
    ampel_service,
    archive_service,
    audit_service,
    backup_service,
    barcode_service,
    dienstbuch_planer_service,
    dienstbuch_service,
    divera_personal_service,
    divera_service,
    einsatz_service,
    formular_service,
    pin_service,
    pressebericht_service,
    stammdaten_service,
)
from app.services.config_service import config_service

logger = structlog.get_logger(__name__)

DIVERA_POLL_INTERVALL_SEKUNDEN = 300


# Toleranz für den Sentry-Cron-Monitor gegen Deploy-Neustarts/Jitter:
# - `checkin_margin`: so viele Minuten darf ein Check-in verspätet sein, bevor er
#   als „verpasst" zählt (deckt den kurzen Scheduler-Ausfall beim Neu-Bauen/Neustart ab).
# - `failure_issue_threshold`: erst nach so vielen AUFEINANDERFOLGENDEN Ausfällen wird
#   ein Issue erzeugt → ein einzelner Deploy-Miss löst kein „Cron failure" mehr aus,
#   ein echter anhaltender Ausfall aber weiterhin.
CHECKIN_MARGIN_MINUTEN = 5
FAILURE_ISSUE_THRESHOLD = 2
# Deploy-Fenster (Minuten), das ein Container-Neustart typischerweise braucht und das
# ein eng getakteter Minuten-Job komplett überbrücken können soll, ohne ein
# „Cron failure"-Issue zu erzeugen.
DEPLOY_FENSTER_MINUTEN = 6


def _failure_threshold(schedule: dict) -> int:
    """Für sehr kurz getaktete Intervall-Jobs (Minutentakt) verpasst EIN
    Deploy-Neustart mehrere AUFEINANDERFOLGENDE Ticks. Damit das kein Issue erzeugt,
    wird die Schwelle so gewählt, dass ein ~`DEPLOY_FENSTER_MINUTEN`-langer Neustart
    überbrückt wird (Anzahl verpasster Ticks + 1 Puffer). Langsamere Jobs (crontab,
    ≥ mehrminütige Intervalle) behalten die strenge Standard-Schwelle – dort ist ein
    verpasster Lauf bereits ein echtes Signal. Regression: JAVASCRIPT-2Z (der
    1-Minuten-Job `einsatz-geplanter-abschluss` flappte bei jedem Deploy)."""
    if schedule.get("type") == "interval" and schedule.get("unit") == "minute":
        wert = int(schedule.get("value", 1) or 1)
        if 0 < wert <= 5:
            verpasste_ticks = -(-DEPLOY_FENSTER_MINUTEN // wert)  # ceil-Division
            return max(FAILURE_ISSUE_THRESHOLD, verpasste_ticks + 1)
    return FAILURE_ISSUE_THRESHOLD


def _monitor_config(schedule: dict) -> dict:
    """Baut die Sentry-Monitor-Konfiguration für einen Job (inkl. Deploy-Toleranz)."""
    return {
        "schedule": schedule,
        "timezone": zeit.STANDARD_ZEITZONE,
        "checkin_margin": CHECKIN_MARGIN_MINUTEN,
        "failure_issue_threshold": _failure_threshold(schedule),
        "recovery_threshold": 1,
    }


def _ueberwacht(slug: str, schedule: dict):
    """Dekorator: meldet jeden Lauf des Scheduler-Jobs als Sentry-Cron-Check-in
    (Sentry „Crons"). So erkennt Sentry ausgefallene/verspätete Läufe und misst
    die Laufzeit. Ist Sentry nicht initialisiert (Fehlerberichte aus), ist der
    Check-in ein No-op – der Job läuft unverändert. Job-interne Fehler werden
    zusätzlich weiterhin über die LoggingIntegration als Issue gemeldet.

    Die Monitor-Config toleriert bewusst kurze Deploy-Neustarts (siehe
    `_monitor_config`), damit nicht jeder Rebuild ein „Cron failure"-Issue erzeugt."""
    monitor_config = _monitor_config(schedule)

    def deko(func):
        @functools.wraps(func)
        async def wrapper() -> None:
            with sentry_sdk.monitor(monitor_slug=slug, monitor_config=monitor_config):
                await func()

        return wrapper

    return deko

# Cron-Jobs (Archivierung, Barcode-Erneuerung, PIN-Erinnerung usw.) sollen zur
# lokalen Uhrzeit feuern, unabhängig von der Container-Zeit (i. d. R. UTC).
scheduler = AsyncIOScheduler(timezone=ZoneInfo(zeit.STANDARD_ZEITZONE))

# Einmal pro Prozessstart zufällig gewählte Uhrzeit (Nachtstunden) für den
# täglichen Divera-Personal-Sync – "zufällig einmal am Tag" statt einer für
# alle Instanzen identischen festen Uhrzeit, ohne ständig wechselnde
# Cron-Ausdrücke verwalten zu müssen.
_DIVERA_PERSONAL_SYNC_STUNDE = random.randint(2, 5)
_DIVERA_PERSONAL_SYNC_MINUTE = random.randint(0, 59)


@_ueberwacht("divera-polling", {"type": "interval", "value": 5, "unit": "minute"})
async def _divera_polling_job() -> None:
    async with AsyncSessionLocal() as db:
        try:
            divera_modus = await config_service.get(db, "divera_modus", "polling")
            if divera_modus != "polling":
                return
            await divera_service.synchronisiere(db)
        except Exception:
            logger.warning("divera_polling_fehlgeschlagen", exc_info=True)


@_ueberwacht("divera-personal-sync", {"type": "interval", "value": 1, "unit": "day"})
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


@_ueberwacht("archivierung", {"type": "crontab", "value": "0 3 * * *"})
async def _archivierung_job() -> None:
    async with AsyncSessionLocal() as db:
        try:
            await archive_service.archiviere_alte_eintraege(db)
        except Exception:
            logger.warning("archivierung_fehlgeschlagen", exc_info=True)


@_ueberwacht("einsatz-autoabschluss", {"type": "crontab", "value": "0 * * * *"})
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


@_ueberwacht("einsatz-geplanter-abschluss", {"type": "interval", "value": 1, "unit": "minute"})
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


@_ueberwacht("pressebericht-versand", {"type": "interval", "value": 15, "unit": "minute"})
async def _pressebericht_versand_job() -> None:
    """Läuft alle 15 min; versendet zeitgesteuerte Presseberichte (Modus 'stunden'
    bzw. 'uhrzeit'). Modus 'schliessen' läuft direkt beim Einsatz-Abschluss und wird
    hier nicht berücksichtigt."""
    async with AsyncSessionLocal() as db:
        try:
            gesendet = await pressebericht_service.faellige_presseberichte_versenden(db)
            if gesendet:
                logger.info("presseberichte_versendet", anzahl=gesendet)
        except Exception:
            logger.warning("pressebericht_versand_job_fehlgeschlagen", exc_info=True)


@_ueberwacht("personen-inaktivitaet", {"type": "crontab", "value": "0 0 * * *"})
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


@_ueberwacht("barcode-erneuerung", {"type": "crontab", "value": "30 3 * * *"})
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


@_ueberwacht("dienstbuch-autoschluss", {"type": "crontab", "value": "0 * * * *"})
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


@_ueberwacht("dienstbuch-plan-verknuepfung", {"type": "crontab", "value": "15 0 * * *"})
async def _dienstbuch_plan_verknuepfung_job() -> None:
    """Läuft täglich um 0:15 Uhr; erzeugt für jeden bestätigten Planer-Termin,
    dessen Zieldatum erreicht ist, automatisch einen echten Dienstbuch-Eintrag
    und verknüpft ihn (Backlog: Modul Dienstbuch Planer). Idempotent über den
    `dienstbuch_id IS NULL`-Filter - ein erneuter Lauf am selben Tag (z. B.
    nach einem Neustart) erzeugt keinen zweiten Eintrag."""
    async with AsyncSessionLocal() as db:
        try:
            heute = (await zeit.jetzt_lokal(db)).date()
            tz = await zeit.zeitzone(db)
            stmt = select(DienstbuchPlanTermin).where(
                DienstbuchPlanTermin.status == "bestaetigt",
                DienstbuchPlanTermin.ist_platzhalter.is_(False),
                DienstbuchPlanTermin.dienstbuch_id.is_(None),
                DienstbuchPlanTermin.zieldatum.isnot(None),
                DienstbuchPlanTermin.zieldatum <= heute,
            )
            faellige = list((await db.execute(stmt)).scalars().all())
            for termin in faellige:
                eroeffnet_am = datetime.combine(termin.zieldatum, termin.uhrzeit or time(0, 0), tzinfo=tz)
                dienstbuch = await dienstbuch_service.dienstbuch_anlegen(
                    db, DienstbuchAnlegen(titel=termin.titel, eroeffnet_am=eroeffnet_am)
                )
                termin.dienstbuch_id = dienstbuch.id
                termin.dienstbuch_erzeugt_am = datetime.now(timezone.utc)
                db.add(
                    DienstbuchPlanTerminEreignis(
                        termin_id=termin.id,
                        typ="dienstbuch_verknuepft",
                        beschreibung="Dienstbuch automatisch erzeugt und verknüpft.",
                        akteur_name=None,
                    )
                )
            if faellige:
                await db.commit()
                logger.info("dienstbuch_plan_verknuepfung_erledigt", anzahl=len(faellige))
        except Exception:
            logger.warning("dienstbuch_plan_verknuepfung_fehlgeschlagen", exc_info=True)


@_ueberwacht("dienstbuch-plan-jahresvorbereitung", {"type": "crontab", "value": "0 2 1 12 *"})
async def _dienstbuch_plan_jahresvorbereitung_job() -> None:
    """Läuft einmal jährlich am 1. Dezember; bereitet die Termin-Instanzen
    für das Folgejahr vor (Komfort-Automatismus - ein Admin kann ein Jahr
    jederzeit auch manuell über den Endpunkt vorziehen). Idempotent (siehe
    `dienstbuch_planer_service.instanzen_fuer_jahr_sicherstellen`)."""
    async with AsyncSessionLocal() as db:
        try:
            heute = (await zeit.jetzt_lokal(db)).date()
            from app.services import feiertag_service

            await feiertag_service.seede_jahr(db, heute.year + 1)
            neue = await dienstbuch_planer_service.instanzen_fuer_jahr_sicherstellen(db, heute.year + 1)
            if neue:
                logger.info("dienstbuch_plan_jahresvorbereitung_erledigt", anzahl=len(neue))
        except Exception:
            logger.warning("dienstbuch_plan_jahresvorbereitung_fehlgeschlagen", exc_info=True)


@_ueberwacht("pin-erinnerung", {"type": "crontab", "value": "0 8 * * *"})
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


@_ueberwacht("personal-ampel", {"type": "crontab", "value": "15 7 * * *"})
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


@_ueberwacht("formular-aufbewahrung", {"type": "crontab", "value": "20 3 * * *"})
async def _formular_aufbewahrung_job() -> None:
    """Läuft täglich um 3:20 Uhr; löscht Formular-Einreichungen, die älter als die
    je Formular gesetzte Aufbewahrungsfrist sind."""
    async with AsyncSessionLocal() as db:
        try:
            geloescht = await formular_service.einreichungen_aufbewahrung_bereinigen(db)
            if geloescht:
                logger.info("formular_einreichungen_bereinigt", anzahl=geloescht)
        except Exception:
            logger.warning("formular_aufbewahrung_job_fehlgeschlagen", exc_info=True)


@_ueberwacht("formular-ablauf", {"type": "interval", "value": 15, "unit": "minute"})
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


@_ueberwacht("audit-retention", {"type": "crontab", "value": "50 3 * * *"})
async def _audit_retention_job() -> None:
    """Läuft täglich um 3:50 Uhr; löscht Audit-Log-Einträge, die älter als die
    konfigurierte Aufbewahrungsfrist sind (Datenminimierung)."""
    async with AsyncSessionLocal() as db:
        try:
            geloescht = await audit_service.aufbewahrung_bereinigen(db)
            if geloescht:
                logger.info("audit_log_bereinigt", anzahl=geloescht)
        except Exception:
            logger.warning("audit_retention_job_fehlgeschlagen", exc_info=True)


@_ueberwacht("backup", {"type": "interval", "value": 15, "unit": "minute"})
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


@_ueberwacht("backup_integritaet", {"type": "interval", "value": 24, "unit": "hour"})
async def _backup_integritaet_job() -> None:
    """Prüft täglich die Integrität des neuesten Backups (rein lesend, kein
    Restore) und legt das Ergebnis fürs Admin-Reporting in app_config ab."""
    async with AsyncSessionLocal() as db:
        try:
            await backup_service.integritaet_pruefen_und_speichern(db)
        except Exception:
            logger.warning("backup_integritaet_job_fehlgeschlagen", exc_info=True)


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
        _dienstbuch_plan_verknuepfung_job,
        "cron",
        hour=0,
        minute=15,
        id="dienstbuch_plan_verknuepfung",
        replace_existing=True,
    )
    logger.info("dienstbuch_plan_verknuepfung_job_registriert", uhrzeit="00:15")

    scheduler.add_job(
        _dienstbuch_plan_jahresvorbereitung_job,
        "cron",
        month=12,
        day=1,
        hour=2,
        minute=0,
        id="dienstbuch_plan_jahresvorbereitung",
        replace_existing=True,
    )
    logger.info("dienstbuch_plan_jahresvorbereitung_job_registriert", uhrzeit="01.12. 02:00")

    scheduler.add_job(
        _personen_inaktivitaet_job,
        "cron",
        hour=0,
        minute=0,
        id="personen_inaktivitaet",
        replace_existing=True,
    )
    logger.info("personen_inaktivitaet_job_registriert", uhrzeit="00:00")

    # Alle 15 min; ob/was versendet wird, entscheidet der Job anhand von
    # pressebericht_versand_modus (app_config) – so wirken Änderungen ohne Neustart.
    scheduler.add_job(
        _pressebericht_versand_job,
        "interval",
        minutes=15,
        id="pressebericht_versand",
        replace_existing=True,
    )
    logger.info("pressebericht_versand_job_registriert")

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

    scheduler.add_job(
        _formular_aufbewahrung_job,
        "cron",
        hour=3,
        minute=20,
        id="formular_aufbewahrung",
        replace_existing=True,
    )
    logger.info("formular_aufbewahrung_job_registriert", uhrzeit="03:20")

    scheduler.add_job(
        _audit_retention_job,
        "cron",
        hour=3,
        minute=50,
        id="audit_retention",
        replace_existing=True,
    )
    logger.info("audit_retention_job_registriert", uhrzeit="03:50")

    # Alle 15 min; ob/ wann tatsächlich gesichert wird, entscheidet der Job anhand
    # der konfigurierten Uhrzeit/Wochentage (einmal pro Tag, mit Nachhol-Logik).
    scheduler.add_job(
        _backup_job,
        "interval",
        minutes=15,
        id="backup",
        replace_existing=True,
    )
    scheduler.add_job(
        _backup_integritaet_job,
        "interval",
        hours=24,
        id="backup_integritaet",
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
