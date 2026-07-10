from datetime import datetime, timezone
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import zeit
from app.models.einsatz import Einsatz
from app.services import divera_client, einsatz_service, notifier_service
from app.services.config_service import config_service

logger = structlog.get_logger(__name__)

# Der 5-Minuten-Poll holt zusätzlich zur Live-Abfrage (/pull/all, nur aktive
# Alarme) die Alarm-Historie der letzten X Minuten und importiert fehlende – auch
# bereits geschlossene – Alarme nach. So rutscht kein Einsatz durch die
# Timing-Lücke, der zwischen zwei Polls erstellt UND geschlossen wurde.
DIVERA_POLLING_HISTORIE_MINUTEN = 30


def _alarm_normalisieren(roh: dict[str, Any]) -> dict[str, Any] | None:
    """Bildet unterschiedliche Divera-Antwortformen auf ein einheitliches
    {divera_id, titel, zeitpunkt} ab. Bei abweichenden Feldnamen (je nach
    Divera-Tarif) genügt eine Anpassung hier."""
    divera_id = roh.get("id") or roh.get("alarm_id")
    titel = roh.get("title") or roh.get("text") or roh.get("name")
    zeit_roh = roh.get("date") or roh.get("start_time") or roh.get("created")
    if divera_id is None or not titel:
        return None

    # `zeit_von_divera` unterscheidet einen echten Divera-Zeitstempel von der
    # Fallback-Systemzeit – nur bei echtem Divera-Zeitstempel wird die Änderung
    # in der Timeline protokolliert.
    zeit_von_divera = True
    if isinstance(zeit_roh, (int, float)):
        zeitpunkt = datetime.fromtimestamp(zeit_roh, tz=timezone.utc)
    elif isinstance(zeit_roh, str):
        try:
            zeitpunkt = datetime.fromisoformat(zeit_roh)
        except ValueError:
            zeitpunkt = datetime.now(timezone.utc)
            zeit_von_divera = False
    else:
        zeitpunkt = datetime.now(timezone.utc)
        zeit_von_divera = False

    # Naive Zeitangaben (ISO ohne Zeitzone) als UTC interpretieren, damit spätere
    # Zeitzonen-Umrechnungen korrekt sind.
    if zeitpunkt.tzinfo is None:
        zeitpunkt = zeitpunkt.replace(tzinfo=timezone.utc)

    # `closed` liefert die Alarm-Historie (/api/v2/alarms) für bereits
    # abgeschlossene Einsätze; aktive Alarme (/pull/all) haben es nicht bzw. False.
    geschlossen = bool(roh.get("closed"))

    # Zusatzinfos: Adresse und ausführlicher Meldungstext. `text` ist die
    # eigentliche Alarmmeldung (der `titel`/`title` ist nur das kurze Stichwort);
    # sind beide identisch, keine redundante Meldung speichern.
    adresse = roh.get("address") or None
    text = roh.get("text") or None
    meldung = text if text and text != str(titel) else None

    # Einsatznummer der Leitstelle – je nach Divera-Tarif in unterschiedlichen
    # Feldern (foreign_id ist die externe Referenz der Leitstelle).
    einsatznummer = roh.get("foreign_id") or roh.get("number") or roh.get("einsatznummer") or None

    return {
        "divera_id": str(divera_id),
        "titel": str(titel),
        "zeitpunkt": zeitpunkt,
        "zeit_von_divera": zeit_von_divera,
        "geschlossen": geschlossen,
        "adresse": str(adresse) if adresse else None,
        "meldung": str(meldung) if meldung else None,
        "einsatznummer": str(einsatznummer) if einsatznummer else None,
    }


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

    # Bereits in Divera geschlossene Alarme (z. B. beim Nachholen der Historie)
    # direkt als abgeschlossen anlegen, damit sie nicht als aktiver Einsatz im
    # Kiosk erscheinen.
    geschlossen = alarm["geschlossen"]
    # Systemzeit zum Anlege-Zeitpunkt festhalten – Divera setzt den Einsatz-
    # Zeitstempel auf die tatsächliche Alarmzeit; die Abweichung wird protokolliert.
    system_zeit = datetime.now(timezone.utc)
    einsatz = Einsatz(
        titel=alarm["titel"],
        quelle="divera",
        divera_id=alarm["divera_id"],
        zeitpunkt=alarm["zeitpunkt"],
        adresse=alarm["adresse"],
        meldung=alarm["meldung"],
        einsatznummer=alarm["einsatznummer"],
        status="abgeschlossen" if geschlossen else "offen",
    )
    db.add(einsatz)
    await db.commit()
    await einsatz_service.ereignis_protokollieren(
        db,
        einsatz.id,
        "angelegt",
        "Einsatz angelegt (divera, bereits abgeschlossen)" if geschlossen else "Einsatz angelegt (divera)",
    )
    # Timeline-Eintrag: Divera hat den Einsatz-Zeitstempel von der Systemzeit auf
    # die tatsächliche Alarmzeit aus Divera geändert (nur bei echtem Divera-Zeitstempel).
    if alarm["zeit_von_divera"]:
        tz = await zeit.zeitzone(db)
        sys_lokal = system_zeit.astimezone(tz)
        divera_lokal = alarm["zeitpunkt"].astimezone(tz)
        await einsatz_service.ereignis_protokollieren(
            db,
            einsatz.id,
            "zeitstempel_divera",
            f"Zeitstempel von der Systemzeit ({sys_lokal:%d.%m.%Y %H:%M} Uhr) auf den "
            f"Divera-Zeitstempel ({divera_lokal:%d.%m.%Y %H:%M} Uhr) geändert.",
        )
    logger.info(
        "divera_einsatz_importiert",
        divera_id=alarm["divera_id"],
        titel=alarm["titel"],
        geschlossen=geschlossen,
    )
    # Für bereits geschlossene (nachgeholte) Alarme keine „neuer Einsatz"-
    # Benachrichtigung – die würde für alte Alarme fälschlich Alarm auslösen.
    if not geschlossen:
        await notifier_service.benachrichtige(db, "benachrichtigung_divera_alarm", titel=alarm["titel"])
    geladen = await einsatz_service.get_einsatz(db, einsatz.id)
    # MinIO-Modul: Einsatz-Ordner sofort anlegen (mit JSON).
    from app.services import minio_service

    if geladen is not None:
        await minio_service.einsatz_dokumente(db, geladen)
    return geladen


async def synchronisiere(db: AsyncSession) -> int:
    """Pollt die Divera-API und importiert neue Alarme. Gibt die Anzahl der
    neu angelegten Einsätze zurück."""
    modul_aktiv = await config_service.get(db, "modul_divera_aktiv", False)
    divera_aktiv = await config_service.get(db, "divera_aktiv", False)
    api_key = await config_service.get(db, "divera_api_key", "")
    if not modul_aktiv or not divera_aktiv or not api_key:
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

    # Sicherheitsnetz gegen die Timing-Lücke von /pull/all (das nur aktuell aktive
    # Alarme liefert): zusätzlich die Historie der letzten Minuten holen und
    # fehlende – auch bereits geschlossene – Alarme idempotent (Upsert über
    # divera_id) nachimportieren.
    historie = await divera_client.hole_alarme_historie(
        api_key, minuten=DIVERA_POLLING_HISTORIE_MINUTEN
    )
    for roh in historie:
        einsatz = await importiere_alarm(db, roh)
        if einsatz is not None:
            anzahl_neu += 1

    await config_service.set(db, "divera_letzter_sync", datetime.now(timezone.utc).isoformat())
    await config_service.set(db, "divera_letzter_sync_anzahl", len(alarme) + len(historie))
    if neuer_ts is not None:
        await config_service.set(db, "divera_last_ts", neuer_ts)
    logger.info(
        "divera_synchronisation_abgeschlossen",
        anzahl_neu=anzahl_neu,
        anzahl_aktiv=len(alarme),
        anzahl_historie=len(historie),
        last_ts=last_ts,
        neuer_ts=neuer_ts,
    )
    return anzahl_neu
