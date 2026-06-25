"""Zentraler Dispatch-Punkt für Benachrichtigungen.

Welche Events Benachrichtigungen auslösen ist über app_config einzeln
an/abschaltbar; welche Kanäle aktiv sind und ihre Zugangsdaten kommen
ebenfalls aus app_config (Moderator-Bereich > Einstellungen), nicht aus der
.env. Domain-Services (Einsatz, Dienstbuch, Buchung, Dienststunden) rufen
ausschließlich `benachrichtige()` auf und kennen die Kanäle nicht.
"""

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.config_service import config_service
from app.services.notifier.base import Notifier
from app.services.notifier.email import EmailNotifier
from app.services.notifier.telegram import TelegramNotifier
from app.services.notifier.webpush import WebPushNotifier

logger = structlog.get_logger(__name__)

EREIGNIS_BETREFF = {
    "benachrichtigung_neuer_einsatz": "Einsatz abgeschlossen",
    "benachrichtigung_neues_dienstbuch": "Neues Dienstbuch",
    "benachrichtigung_buchungsanfrage": "Neue Buchungsanfrage",
    "benachrichtigung_schwellenwert_ueberschreitung": "Dienststunden-Schwellenwert überschritten",
}

EREIGNIS_VORLAGE = {
    "benachrichtigung_neuer_einsatz": "benachrichtigung_text_neuer_einsatz",
    "benachrichtigung_neues_dienstbuch": "benachrichtigung_text_neues_dienstbuch",
    "benachrichtigung_buchungsanfrage": "benachrichtigung_text_buchungsanfrage",
    "benachrichtigung_schwellenwert_ueberschreitung": "benachrichtigung_text_schwellenwert_ueberschreitung",
}


async def _aktive_notifier(db: AsyncSession) -> list[Notifier]:
    notifier: list[Notifier] = []
    if await config_service.get(db, "notifier_telegram_aktiv", False):
        notifier.append(TelegramNotifier())
    if await config_service.get(db, "notifier_email_aktiv", False):
        notifier.append(EmailNotifier())
    if await config_service.get(db, "notifier_webpush_aktiv", False):
        notifier.append(WebPushNotifier())
    return notifier


async def benachrichtige(
    db: AsyncSession,
    ereignis_schluessel: str,
    ausschluss_kanaele: set[str] | None = None,
    **platzhalter: object,
) -> None:
    """Sendet eine Benachrichtigung für ein Ereignis, falls es in app_config
    aktiviert ist. ereignis_schluessel ist einer der vier
    benachrichtigung_*-Keys aus app_config. `ausschluss_kanaele` erlaubt es
    Aufrufern, einen Kanal hier auszulassen, wenn sie ihn selbst (z. B. mit
    PDF-Anhang) separat bedienen, um Doppel-Mails zu vermeiden."""
    if not await config_service.get(db, ereignis_schluessel, True):
        return

    vorlage_schluessel = EREIGNIS_VORLAGE[ereignis_schluessel]
    vorlage = await config_service.get(db, vorlage_schluessel, "")
    try:
        nachricht = vorlage.format(**platzhalter)
    except (KeyError, IndexError):
        logger.warning("benachrichtigung_vorlage_ungueltig", schluessel=vorlage_schluessel)
        nachricht = vorlage

    betreff = EREIGNIS_BETREFF[ereignis_schluessel]
    for notifier in await _aktive_notifier(db):
        if ausschluss_kanaele and notifier.name in ausschluss_kanaele:
            continue
        try:
            await notifier.send(db, betreff, nachricht)
        except Exception:
            logger.warning("notifier_fehlgeschlagen", kanal=notifier.name, exc_info=True)
