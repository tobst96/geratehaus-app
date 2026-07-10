"""Modul Pressebericht: erzeugt je Einsatz einen konfigurierbaren Pressebericht als
PDF, versendet ihn an die Abonnenten des Ereignisses `benachrichtigung_pressebericht`,
legt ihn im MinIO-Einsatzordner ab und protokolliert den Versand in der
Einsatz-Timeline.

Welche Inhalte der Bericht enthält und wann er versendet wird, steht vollständig in
`app_config` (siehe `config_defaults.py`, Präfix `pressebericht_*`) – nichts davon
ist organisationsspezifisch hartcodiert.
"""

from datetime import datetime, timedelta, timezone

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import zeit
from app.models.einsatz import Einsatz
from app.models.einsatz_ereignis import EinsatzEreignis
from app.services import (
    benachrichtigungskanal_service,
    minio_service,
    pdf_service,
    stammdaten_service,
)
from app.services.config_service import config_service
from app.services.notifier.email import EmailNotifier

logger = structlog.get_logger(__name__)

EREIGNIS = "benachrichtigung_pressebericht"


async def _modul_aktiv(db: AsyncSession) -> bool:
    return bool(await config_service.get(db, "modul_pressebericht_aktiv", False))


async def _kontext(db: AsyncSession, einsatz: Einsatz) -> dict:
    """Baut den Template-Kontext ausschließlich aus den konfigurierten Blöcken."""
    kontext: dict = {
        "grunddaten": bool(await config_service.get(db, "pressebericht_felder_grunddaten", True)),
        "divera": None,
        "zusatzfelder_anzeige": [],
        "teilnehmer_anzahl": None,
        "teilnehmer_namen": [],
        "fahrzeuge": [],
        "minio_link": None,
    }

    # Divera-Informationen (nur wenn Einsatz aus Divera stammt).
    if await config_service.get(db, "pressebericht_felder_divera", False) and einsatz.quelle == "divera":
        divera_zeilen = []
        if einsatz.einsatznummer:
            divera_zeilen.append({"label": "Einsatznummer", "wert": einsatz.einsatznummer})
        if einsatz.adresse:
            divera_zeilen.append({"label": "Adresse", "wert": einsatz.adresse})
        if einsatz.meldung:
            divera_zeilen.append({"label": "Meldung", "wert": einsatz.meldung})
        kontext["divera"] = divera_zeilen or None

    # Einzeln ausgewählte Zusatzfelder.
    ausgewaehlt = await config_service.get(db, "pressebericht_zusatzfelder", [])
    if ausgewaehlt:
        felder = {f.schluessel: f for f in await stammdaten_service.liste_einsatz_felder(db, nur_aktive=False)}
        for schluessel in ausgewaehlt:
            feld = felder.get(schluessel)
            if feld is None:
                continue
            wert = (einsatz.zusatzfelder or {}).get(schluessel)
            if wert in (None, "", False):
                continue
            kontext["zusatzfelder_anzeige"].append(
                {"label": feld.label, "wert": "Ja" if wert is True else wert}
            )

    # Teilnehmer: Anzahl und/oder Namensliste (getrennt schaltbar).
    teilnahmen = list(einsatz.teilnahmen or [])
    if await config_service.get(db, "pressebericht_teilnehmer_anzahl", True):
        kontext["teilnehmer_anzahl"] = len(teilnahmen)
    if await config_service.get(db, "pressebericht_teilnehmer_namen", False):
        kontext["teilnehmer_namen"] = [
            t.person.name for t in teilnahmen if getattr(t, "person", None) is not None
        ]

    # Fahrzeuge mit Besatzung.
    if await config_service.get(db, "pressebericht_fahrzeuge", True):
        fahrzeuge: dict[int, dict] = {}
        for t in teilnahmen:
            fz = getattr(t, "fahrzeug", None)
            if fz is None:
                continue
            eintrag = fahrzeuge.setdefault(fz.id, {"name": fz.name, "besatzung": []})
            if getattr(t, "person", None) is not None:
                eintrag["besatzung"].append(t.person.name)
        kontext["fahrzeuge"] = list(fahrzeuge.values())

    # Optionaler App-interner Link zum MinIO-Einsatzordner.
    if await config_service.get(db, "pressebericht_minio_link", False):
        kontext["minio_link"] = await minio_service.einsatz_ordner_link(db, einsatz.id)

    return kontext


async def pressebericht_versenden(db: AsyncSession, einsatz: Einsatz, grund: str = "manuell") -> bool:
    """Erzeugt den Pressebericht, versendet ihn und protokolliert den Versand.
    Gibt False zurück, wenn das Modul inaktiv ist. Setzt `pressebericht_gesendet_am`.
    Best-effort für Mail/MinIO – ein Fehlversand blockiert den Marker nicht, wird
    aber in der Timeline vermerkt."""
    from app.services import einsatz_service

    if not await _modul_aktiv(db):
        return False

    geladen = await einsatz_service.get_einsatz(db, einsatz.id)
    if geladen is None:
        return False

    kontext = await _kontext(db, geladen)
    pdf = await pdf_service.pressebericht_pdf(db, geladen, kontext)

    # PDF im Einsatz-Ordner ablegen (best-effort).
    await minio_service.einsatz_pressebericht(db, geladen, pdf)

    # Mail an Abonnenten des Ereignisses (Master-Schalter beachten).
    versendet_an = 0
    mail_ok = True
    if await config_service.get(db, EREIGNIS, True):
        empfaenger = await benachrichtigungskanal_service.mail_empfaenger_fuer_ereignis(db, EREIGNIS)
        if empfaenger:
            vorlage = await config_service.get(db, "benachrichtigung_text_pressebericht", "")
            try:
                nachricht = vorlage.format(titel=geladen.titel)
            except (KeyError, IndexError):
                nachricht = vorlage
            try:
                await EmailNotifier().pdf_versenden(
                    db,
                    f"Pressebericht: {geladen.titel}",
                    nachricht,
                    f"pressebericht-einsatz-{geladen.id}.pdf",
                    pdf,
                    empfaenger_liste=empfaenger,
                )
                versendet_an = len(empfaenger)
            except Exception:
                mail_ok = False
                logger.warning("pressebericht_mail_fehlgeschlagen", einsatz_id=geladen.id, exc_info=True)

    if versendet_an:
        beschreibung = f"Pressebericht erstellt und an {versendet_an} Empfänger versendet"
    elif not mail_ok:
        beschreibung = "Pressebericht erstellt – E-Mail-Versand fehlgeschlagen (siehe Log)"
    else:
        beschreibung = "Pressebericht erstellt (keine Abonnenten für den Versand)"

    geladen.pressebericht_gesendet_am = datetime.now(timezone.utc)
    await einsatz_service.ereignis_protokollieren(db, geladen.id, "pressebericht", beschreibung)
    return True


async def _uhrzeit_faellig(db: AsyncSession) -> bool:
    """True, wenn die konfigurierte Versand-Uhrzeit im aktuellen 15-Minuten-Fenster
    liegt (der Job läuft alle 15 min)."""
    roh = str(await config_service.get(db, "pressebericht_versand_uhrzeit", "08:00"))
    try:
        stunde, minute = (int(x) for x in roh.split(":", 1))
    except (ValueError, TypeError):
        return False
    jetzt = await zeit.jetzt_lokal(db)
    ziel = jetzt.replace(hour=stunde, minute=minute, second=0, microsecond=0)
    return ziel <= jetzt < ziel + timedelta(minutes=15)


async def faellige_einsaetze(db: AsyncSession) -> list[Einsatz]:
    """Abgeschlossene Einsätze, für die laut konfiguriertem Modus jetzt ein
    Pressebericht fällig ist (nur Modi 'stunden'/'uhrzeit'; 'schliessen' wird direkt
    beim Abschluss versendet)."""
    if not await _modul_aktiv(db):
        return []
    modus = str(await config_service.get(db, "pressebericht_versand_modus", "schliessen"))

    basis = (
        select(Einsatz)
        .where(
            Einsatz.status == "abgeschlossen",
            Einsatz.pressebericht_gesendet_am.is_(None),
        )
        .order_by(Einsatz.zeitpunkt)
    )

    if modus == "stunden":
        stunden = int(await config_service.get(db, "pressebericht_versand_stunden", 24))
        grenze = datetime.now(timezone.utc) - timedelta(hours=max(0, stunden))
        # Referenz: Zeitpunkt des „abgeschlossen"-Timeline-Ereignisses.
        abschluss = (
            select(
                EinsatzEreignis.einsatz_id.label("einsatz_id"),
                func.max(EinsatzEreignis.zeitpunkt).label("abgeschlossen_am"),
            )
            .where(EinsatzEreignis.typ == "abgeschlossen")
            .group_by(EinsatzEreignis.einsatz_id)
            .subquery()
        )
        stmt = basis.join(abschluss, abschluss.c.einsatz_id == Einsatz.id).where(
            abschluss.c.abgeschlossen_am <= grenze
        )
    elif modus == "uhrzeit":
        if not await _uhrzeit_faellig(db):
            return []
        stmt = basis
    else:
        return []

    result = await db.execute(stmt)
    return list(result.scalars().all())


async def faellige_presseberichte_versenden(db: AsyncSession) -> int:
    """Scheduler-Einstieg: versendet für alle fälligen Einsätze den Pressebericht.
    Pro Einsatz mit eigenem try/except, damit ein Fehler die übrigen nicht stoppt."""
    einsaetze = await faellige_einsaetze(db)
    gesendet = 0
    for einsatz in einsaetze:
        try:
            if await pressebericht_versenden(db, einsatz, grund="zeitgesteuert"):
                gesendet += 1
        except Exception:
            await db.rollback()
            logger.warning("pressebericht_versand_fehlgeschlagen", einsatz_id=einsatz.id, exc_info=True)
    return gesendet
