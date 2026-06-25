from datetime import datetime, timedelta, timezone

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.einsatz import Einsatz, EinsatzPerson
from app.models.einsatz_ereignis import EinsatzEreignis
from app.schemas.einsatz import EinsatzAnlegen, TeilnahmeAnlegen
from app.services import notifier_service, pdf_service
from app.services.config_service import config_service
from app.services.notifier.email import EmailNotifier

logger = structlog.get_logger(__name__)


async def ereignis_protokollieren(
    db: AsyncSession, einsatz_id: int, typ: str, beschreibung: str
) -> None:
    db.add(EinsatzEreignis(einsatz_id=einsatz_id, typ=typ, beschreibung=beschreibung))
    await db.commit()


async def liste_ereignisse(db: AsyncSession, einsatz_id: int) -> list[EinsatzEreignis]:
    result = await db.execute(
        select(EinsatzEreignis)
        .where(EinsatzEreignis.einsatz_id == einsatz_id)
        .order_by(EinsatzEreignis.zeitpunkt)
    )
    return list(result.scalars().all())

_TEILNAHME_DETAILS = selectinload(Einsatz.teilnahmen).options(
    selectinload(EinsatzPerson.person),
    selectinload(EinsatzPerson.fahrzeug),
    selectinload(EinsatzPerson.funktion),
)


async def liste_einsaetze(db: AsyncSession, nur_unarchiviert: bool = True) -> list[Einsatz]:
    stmt = select(Einsatz).options(_TEILNAHME_DETAILS).order_by(Einsatz.zeitpunkt.desc())
    if nur_unarchiviert:
        stmt = stmt.where(Einsatz.archiviert.is_(False))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_einsatz(db: AsyncSession, einsatz_id: int) -> Einsatz | None:
    stmt = select(Einsatz).options(_TEILNAHME_DETAILS).where(Einsatz.id == einsatz_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def einsatz_anlegen(db: AsyncSession, daten: EinsatzAnlegen, quelle: str = "manuell") -> Einsatz:
    einsatz = Einsatz(titel=daten.titel, zeitpunkt=daten.zeitpunkt, quelle=quelle)
    db.add(einsatz)
    await db.commit()
    await ereignis_protokollieren(
        db, einsatz.id, "angelegt", f"Einsatz angelegt ({quelle})"
    )
    await notifier_service.benachrichtige(db, "benachrichtigung_neuer_einsatz", titel=einsatz.titel)
    geladen = await get_einsatz(db, einsatz.id)
    assert geladen is not None
    return geladen


async def teilnahme_eintragen(
    db: AsyncSession, einsatz: Einsatz, person_id: int, daten: TeilnahmeAnlegen
) -> EinsatzPerson:
    """Legt die Teilnahme an, oder aktualisiert sie, falls die Person bereits
    für diesen Einsatz eingetragen ist."""
    stmt = select(EinsatzPerson).where(
        EinsatzPerson.einsatz_id == einsatz.id, EinsatzPerson.person_id == person_id
    )
    result = await db.execute(stmt)
    teilnahme = result.scalar_one_or_none()
    if teilnahme is None:
        teilnahme = EinsatzPerson(einsatz_id=einsatz.id, person_id=person_id)
        db.add(teilnahme)

    ist_neu = teilnahme.id is None
    teilnahme.fahrzeug_id = daten.fahrzeug_id
    teilnahme.sitzplatz_id = daten.sitzplatz_id
    teilnahme.funktion_id = daten.funktion_id
    teilnahme.vab = daten.vab
    teilnahme.atemschutzminuten = daten.atemschutzminuten
    teilnahme.nur_geraetehaus = daten.nur_geraetehaus
    teilnahme.auf_anfahrt = daten.auf_anfahrt
    teilnahme.ohne_barcode = daten.ohne_barcode
    teilnahme.bemerkung = daten.bemerkung
    await db.commit()

    geladen = await db.execute(
        select(EinsatzPerson)
        .options(
            selectinload(EinsatzPerson.person),
            selectinload(EinsatzPerson.fahrzeug),
            selectinload(EinsatzPerson.funktion),
        )
        .where(EinsatzPerson.id == teilnahme.id)
    )
    ergebnis = geladen.scalar_one()

    if ergebnis.nur_geraetehaus:
        ort = "Einsatzbereit im Feuerwehrhaus"
    elif ergebnis.auf_anfahrt:
        ort = "Auf Anfahrt"
    elif ergebnis.fahrzeug_name:
        ort = ergebnis.fahrzeug_name
    else:
        ort = "ohne Fahrzeugzuordnung"
    verb = "eingetragen" if ist_neu else "aktualisiert"
    zusatz = " (ohne Barcode, per QR-Code selbst eingetragen)" if ergebnis.ohne_barcode else ""
    await ereignis_protokollieren(
        db, einsatz.id, "teilnahme", f"{ergebnis.person_name} {verb}: {ort}{zusatz}"
    )
    return ergebnis


async def zusatzfelder_aktualisieren(
    db: AsyncSession, einsatz: Einsatz, zusatzfelder: dict
) -> Einsatz:
    einsatz.zusatzfelder = {**einsatz.zusatzfelder, **zusatzfelder}
    await db.commit()
    await ereignis_protokollieren(db, einsatz.id, "details", "Einsatzdetails aktualisiert")
    geladen = await get_einsatz(db, einsatz.id)
    assert geladen is not None
    return geladen


async def einsatz_abschliessen(db: AsyncSession, einsatz: Einsatz) -> Einsatz:
    einsatz.status = "abgeschlossen"
    einsatz.geplanter_abschluss_am = None
    await db.commit()
    await ereignis_protokollieren(db, einsatz.id, "abgeschlossen", "Einsatz abgeschlossen")
    geladen = await get_einsatz(db, einsatz.id)
    assert geladen is not None
    await _pdf_per_mail_versenden(db, geladen)
    return geladen


async def einsatz_wieder_oeffnen(db: AsyncSession, einsatz: Einsatz) -> Einsatz:
    einsatz.status = "offen"
    einsatz.geplanter_abschluss_am = None
    await db.commit()
    await ereignis_protokollieren(db, einsatz.id, "wiedereroeffnet", "Einsatz wieder geöffnet")
    geladen = await get_einsatz(db, einsatz.id)
    assert geladen is not None
    return geladen


async def einsatz_abschluss_planen(db: AsyncSession, einsatz: Einsatz, minuten: int) -> Einsatz:
    """'Alle eingetragen' im Gerätehaus: schließt den Einsatz nicht sofort,
    sondern plant den Abschluss für in `minuten` Minuten ein, damit
    Nachzügler noch eingetragen werden können."""
    einsatz.geplanter_abschluss_am = datetime.now(timezone.utc) + timedelta(minutes=minuten)
    await db.commit()
    await ereignis_protokollieren(
        db, einsatz.id, "details", f"Einsatz wird in {minuten} Minuten automatisch abgeschlossen (alle eingetragen)"
    )
    geladen = await get_einsatz(db, einsatz.id)
    assert geladen is not None
    return geladen


async def einsaetze_mit_faelligem_abschluss(db: AsyncSession) -> list[Einsatz]:
    jetzt = datetime.now(timezone.utc)
    stmt = (
        select(Einsatz)
        .options(_TEILNAHME_DETAILS)
        .where(
            Einsatz.status != "abgeschlossen",
            Einsatz.geplanter_abschluss_am.is_not(None),
            Einsatz.geplanter_abschluss_am <= jetzt,
        )
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def _pdf_per_mail_versenden(db: AsyncSession, einsatz: Einsatz) -> None:
    if not await config_service.get(db, "notifier_email_aktiv", False):
        return
    if not await config_service.get(db, "notifier_email_pdf_bei_abschluss", False):
        return
    try:
        pdf_inhalt = await pdf_service.einsatz_pdf(db, einsatz)
        dateiname = f"einsatz-{einsatz.id}.pdf"
        await EmailNotifier().pdf_versenden(
            db,
            f"Einsatzbericht: {einsatz.titel}",
            f"Im Anhang der Einsatzbericht für „{einsatz.titel}“.",
            dateiname,
            pdf_inhalt,
        )
        await ereignis_protokollieren(db, einsatz.id, "email", "Einsatzbericht (PDF) per E-Mail versendet")
    except Exception as exc:
        logger.warning("einsatz_pdf_mail_fehlgeschlagen", exc_info=True)
        await ereignis_protokollieren(
            db, einsatz.id, "email_fehler", f"Versand des Einsatzberichts per E-Mail fehlgeschlagen: {exc}"
        )


async def offene_einsaetze_inaktiv_seit(db: AsyncSession, inaktivitaet_stunden: int) -> list[Einsatz]:
    """Offene Einsätze, deren letztes protokolliertes Ereignis (oder, falls
    noch keines existiert, deren Anlage) mindestens `inaktivitaet_stunden`
    zurückliegt – Grundlage für den nächtlichen Autoabschluss-Job."""
    grenze = datetime.now(timezone.utc) - timedelta(hours=inaktivitaet_stunden)
    letztes_ereignis = (
        select(
            EinsatzEreignis.einsatz_id.label("einsatz_id"),
            func.max(EinsatzEreignis.zeitpunkt).label("letzte_aktivitaet"),
        )
        .group_by(EinsatzEreignis.einsatz_id)
        .subquery()
    )
    stmt = (
        select(Einsatz)
        .options(_TEILNAHME_DETAILS)
        .outerjoin(letztes_ereignis, letztes_ereignis.c.einsatz_id == Einsatz.id)
        .where(
            Einsatz.status != "abgeschlossen",
            func.coalesce(letztes_ereignis.c.letzte_aktivitaet, Einsatz.erstellt_am) < grenze,
        )
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
