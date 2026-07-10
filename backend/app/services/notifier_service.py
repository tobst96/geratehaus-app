"""Zentraler Dispatch-Punkt für Benachrichtigungen.

Ereignis-Benachrichtigungen gehen ausschließlich an **Personen, die das jeweilige
Ereignis abonniert haben** (Personal-Bereich > Benachrichtigungskanäle), und zwar
über deren **aktive Kanäle** (E-Mail/Telegram mit hinterlegtem Zielwert). Ob ein
Ereignis überhaupt ausgelöst wird, ist zusätzlich global über app_config
an/abschaltbar (Master-Schalter). Domain-Services rufen ausschließlich
`benachrichtige()` auf und kennen die Zustellung nicht.
"""

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.services import benachrichtigungskanal_service
from app.services.config_service import config_service
from app.services.notifier.email import EmailNotifier
from app.services.notifier.telegram import TelegramNotifier

logger = structlog.get_logger(__name__)

EREIGNIS_BETREFF = {
    "benachrichtigung_neuer_einsatz": "Einsatz abgeschlossen",
    "benachrichtigung_divera_alarm": "Neuer Einsatz",
    "benachrichtigung_neues_dienstbuch": "Neues Dienstbuch",
    "benachrichtigung_buchungsanfrage": "Neue Buchungsanfrage",
    "benachrichtigung_schwellenwert_ueberschreitung": "Dienststunden-Schwellenwert überschritten",
    "benachrichtigung_person_inaktiv": "Person inaktiv – wird bald gelöscht",
    "benachrichtigung_person_ampel_gelb": "Person überfällig (Ampel gelb)",
    "benachrichtigung_person_ampel_rot": "Person überfällig (Ampel rot)",
    "benachrichtigung_pressebericht": "Pressebericht",
}

EREIGNIS_VORLAGE = {
    "benachrichtigung_neuer_einsatz": "benachrichtigung_text_neuer_einsatz",
    "benachrichtigung_divera_alarm": "benachrichtigung_text_divera_alarm",
    "benachrichtigung_neues_dienstbuch": "benachrichtigung_text_neues_dienstbuch",
    "benachrichtigung_buchungsanfrage": "benachrichtigung_text_buchungsanfrage",
    "benachrichtigung_schwellenwert_ueberschreitung": "benachrichtigung_text_schwellenwert_ueberschreitung",
    "benachrichtigung_person_inaktiv": "benachrichtigung_text_person_inaktiv",
    "benachrichtigung_person_ampel_gelb": "benachrichtigung_text_person_ampel_gelb",
    "benachrichtigung_person_ampel_rot": "benachrichtigung_text_person_ampel_rot",
    "benachrichtigung_pressebericht": "benachrichtigung_text_pressebericht",
}

# Kanal-Typ (Benachrichtigungskanal.typ) → Notifier-Kanalname (für ausschluss_kanaele,
# das historisch die Notifier-Namen nutzt, z. B. {"email"}).
_KANAL_NAME = {"mail": "email", "telegram": "telegram"}


async def benachrichtige(
    db: AsyncSession,
    ereignis_schluessel: str,
    ausschluss_kanaele: set[str] | None = None,
    nachricht_override: str | None = None,
    **platzhalter: object,
) -> None:
    """Sendet eine Ereignis-Benachrichtigung an alle Personen, die das Ereignis
    abonniert haben, über ihre aktiven Kanäle. Voraussetzung: das Ereignis ist in
    app_config global aktiviert (Master-Schalter). `ausschluss_kanaele` (Notifier-
    Namen wie {"email"}) lässt einen Kanaltyp aus, wenn der Aufrufer ihn separat
    bedient (z. B. PDF-Mail), um Doppelversand zu vermeiden.

    `nachricht_override` setzt den fertigen Nachrichtentext direkt (statt die
    Vorlage mit Platzhaltern zu füllen). Damit kann ein Aufrufer mehrere Vorfälle
    zu **einer** Sammel-Benachrichtigung bündeln (z. B. die Aktivitäts-Ampel, die
    sonst je überfälliger Person eine eigene Nachricht auslösen würde)."""
    if not await config_service.get(db, ereignis_schluessel, True):
        return

    if nachricht_override is not None:
        nachricht = nachricht_override
    else:
        vorlage_schluessel = EREIGNIS_VORLAGE[ereignis_schluessel]
        vorlage = await config_service.get(db, vorlage_schluessel, "")
        try:
            nachricht = vorlage.format(**platzhalter)
        except (KeyError, IndexError):
            logger.warning("benachrichtigung_vorlage_ungueltig", schluessel=vorlage_schluessel)
            nachricht = vorlage

    betreff = EREIGNIS_BETREFF[ereignis_schluessel]

    empfaenger = await benachrichtigungskanal_service.empfaenger_fuer_ereignis(
        db, ereignis_schluessel
    )
    if not empfaenger:
        return

    email = EmailNotifier()
    telegram = TelegramNotifier()
    for person, kanaele in empfaenger:
        for kanal in kanaele:
            if ausschluss_kanaele and _KANAL_NAME.get(kanal.typ, kanal.typ) in ausschluss_kanaele:
                continue
            try:
                if kanal.typ == "mail":
                    # E-Mail-Kanal nutzt immer die E-Mail-Adresse der Person –
                    # keine zweite, separat gepflegte Adresse mehr.
                    ziel = (person.email or "").strip()
                    if ziel:
                        await email.send_an(db, ziel, betreff, nachricht)
                elif kanal.typ == "telegram":
                    await telegram.send_an_chat(db, kanal.zielwert, betreff, nachricht)
            except Exception:
                logger.warning(
                    "notifier_fehlgeschlagen", kanal=kanal.typ, person_id=person.id, exc_info=True
                )
