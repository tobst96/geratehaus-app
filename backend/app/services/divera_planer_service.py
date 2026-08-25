"""Übertragung von Dienstbuch-Planer-Terminen nach Divera 24/7 (Phase 4).

BEWUSSTE AUSNAHME vom Projekt-Grundsatz „Divera nur lesen, kein Rückkanal"
(siehe .claude/docs/backlog.md, Abschnitt „Divera 24/7") - vom Nutzer am
25.08.2026 ausdrücklich gewünscht. Nutzt den offiziellen Termine-Webservice
(POST /api/v2/events, Spezifikation api.divera247.com/docs/api_v2_event.yaml).

Empfängerwahl: ohne Gruppen geht der Termin an ALLE des Standorts
(notification_type=2); mit Gruppen an die genannten Gruppen
(notification_type=3), wobei Divera die Gruppen-NAMEN direkt akzeptiert
(instructions.group.mapping = "title") - es braucht also keine Gruppen-IDs.
"""

from dataclasses import dataclass
from datetime import datetime, time, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core import zeit
from app.services import dienstbuch_planer_service, divera_client
from app.services.config_service import config_service


@dataclass
class UebertragungsErgebnis:
    termin_id: int
    titel: str
    ok: bool
    fehler: str = ""


async def uebertrage_termine(
    db: AsyncSession,
    termin_ids: list[int],
    gruppen: list[str],
    erinnerung_minuten: int | None,
    send_push: bool,
    akteur_name: str | None,
) -> list[UebertragungsErgebnis]:
    api_key = str(await config_service.get(db, "divera_api_key", "") or "")
    if not api_key:
        return [
            UebertragungsErgebnis(
                termin_id=tid, titel="", ok=False, fehler="Kein Divera-API-Key konfiguriert (Modul Divera)."
            )
            for tid in termin_ids
        ]

    tz = await zeit.zeitzone(db)
    ergebnisse: list[UebertragungsErgebnis] = []

    for termin_id in termin_ids:
        termin = await dienstbuch_planer_service.get_termin(db, termin_id)
        if termin is None:
            ergebnisse.append(
                UebertragungsErgebnis(termin_id=termin_id, titel="", ok=False, fehler="Termin nicht gefunden.")
            )
            continue
        if termin.zieldatum is None:
            ergebnisse.append(
                UebertragungsErgebnis(
                    termin_id=termin_id, titel=termin.titel, ok=False, fehler="Platzhalter ohne Datum."
                )
            )
            continue

        start = datetime.combine(termin.zieldatum, termin.uhrzeit or time(0, 0), tzinfo=tz)
        if termin.uhrzeit and termin.endzeit and termin.endzeit > termin.uhrzeit:
            ende = datetime.combine(termin.zieldatum, termin.endzeit, tzinfo=tz)
        elif termin.uhrzeit:
            ende = start + timedelta(hours=1)
        else:
            ende = start + timedelta(days=1)

        event: dict = {
            "title": termin.titel,
            "ts_start": int(start.timestamp()),
            "ts_end": int(ende.timestamp()),
            "fullday": termin.uhrzeit is None,
            "send_push": send_push,
        }
        if termin.beschreibung:
            event["text"] = termin.beschreibung
        if gruppen:
            event["notification_type"] = 3
            event["group"] = gruppen
            event["instructions"] = {"group": {"mapping": "title"}}
        else:
            event["notification_type"] = 2

        reminder: dict | None = None
        if erinnerung_minuten and erinnerung_minuten > 0:
            reminder = {
                "ts": int((start - timedelta(minutes=erinnerung_minuten)).timestamp()),
                "send_push": True,
            }

        ok, fehler = await divera_client.erstelle_termin(api_key, event, reminder)
        if ok:
            await dienstbuch_planer_service._ereignis_protokollieren(
                db,
                termin.id,
                "divera_uebertragen",
                "An Divera übertragen"
                + (f" (Gruppen: {', '.join(gruppen)})" if gruppen else " (alle)")
                + (f", Erinnerung {erinnerung_minuten} min vorher" if erinnerung_minuten else "")
                + ".",
                akteur_name,
            )
            await db.commit()
        ergebnisse.append(
            UebertragungsErgebnis(termin_id=termin.id, titel=termin.titel, ok=ok, fehler=fehler)
        )

    return ergebnisse
